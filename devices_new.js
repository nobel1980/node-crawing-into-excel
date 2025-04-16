import batchRequest from "batch-request-js";
import { token } from "./token.js";
import "dotenv/config";
// import dsnCount from './dsnCount.js';
import dotenv from 'dotenv';
import https from 'https';
import { setTimeout } from 'timers/promises';

dotenv.config();

// Configure HTTP agent for connection pooling
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

console.log('Initializing device data collection');
console.log('API Base URL:', process.env.URL || 'https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory');
console.log('TLS Verification:', process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0' ? 'Disabled' : 'Enabled');

const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await setTimeout(1000 * attempt); // Exponential backoff
      console.log(`Retry ${attempt} for ${url}`);
    }
  }
};

const devicesCount = async () => {
  try {
    console.log("Starting device data collection...");
    
    // Get total pages
    const initialUrl = `https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices?page=1&size=10`;
    
    const { totalPages } = await fetchWithRetry(initialUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      agent
    });

    console.log(`Found ${totalPages} pages of devices to process`);

    // Prepare page requests
    const pageNumbers = Array.from({ length: totalPages }, (_, i) => i + 1);
    
    // Define request function for batch processing
    const requestPage = async (pageNumber) => {
      try {
        const url = `https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices?page=${pageNumber}&size=50`;
        return await fetchWithRetry(url, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
          agent
        });
      } catch (error) {
        console.error(`Failed to fetch page ${pageNumber}:`, error.message);
        return { error: `Page ${pageNumber} failed: ${error.message}` };
      }
    };

    // Process pages in batches
    const { data: pageResults, error: batchError } = await batchRequest(pageNumbers, {
      request: requestPage,
      batchSize: 10, // Smaller batch size for page requests
      delay: 1000
    });

    if (batchError) {
      console.error("Batch processing encountered errors:", batchError);
    }

    // Extract device IDs
    const devicesId = pageResults
      .filter(result => !result.error) // Filter out failed pages
      .flatMap(page => page.content.map(item => item.id));

    console.log(`Collected ${devicesId.length} device IDs`);

    if (devicesId.length === 0) {
      throw new Error("No device IDs were collected");
    }

    // Process devices with dsnCount
    await dsnCount(devicesId);

    console.log("Device data collection completed successfully");
  } catch (error) {
    console.error("Error in devicesCount:", error);
    process.exit(1); // Exit with error code
  }
};

// Execute with error handling
devicesCount()
  .catch(error => {
    console.error("Unhandled error in devicesCount:", error);
    process.exit(1);
  });