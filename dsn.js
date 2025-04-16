import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import { setTimeout } from 'timers/promises';
import https from 'https';
import { token } from "./token.js";
import dotenv from 'dotenv';
import { writeFile } from 'fs/promises';

dotenv.config();

// Configure HTTP agent for connection pooling
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

// Shared fetch options
const fetchOptions = {
  method: "GET",
  headers: { Authorization: `Bearer ${token}` },
  agent
};

// Enhanced fetch with retry logic
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await setTimeout(1000 * attempt); // Exponential backoff
      }
    }
  }
  throw lastError;
};

const dsnCount = async (devicesId) => {
  try {
    // Track progress
    let processedCount = 0;
    const totalDevices = devicesId.length;
    const progressFile = 'progress.json';
    
    // Save progress periodically
    const saveProgress = async (data) => {
      await writeFile(progressFile, JSON.stringify(data, null, 2));
      console.log(`Progress saved: ${processedCount}/${totalDevices} devices processed`);
    };

    // Process devices in optimized batches
    const processDevice = async (id) => {
      try {
        const [deviceData, inUse] = await Promise.all([
          fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices/${id}`, fetchOptions),
          fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${id}`, fetchOptions)
        ]);
        
        processedCount++;
        if (processedCount % 100 === 0) {
          console.log(`Progress: ${processedCount}/${totalDevices} (${Math.round((processedCount/totalDevices)*100)}%)`);
        }

        // const filtered = deviceData.filter(n => [2, 1, 3, 4, 5, 9, 10, 11, 12, 13, 17].includes(n));
        return {
          ...deviceData,
          // ...filtered,
          deviceStatus: inUse ? "In use" : "Not in use"
        };
      } catch (error) {
        console.error(`Failed to process device ${id}:`, error.message);
        return { id, error: error.message }; // Return error info for failed devices
      }
    };

    // Process in batches with progress saving
    const processBatch = async (items, batchSize = 100, delayMs = 2000) => {
      const results = [];
      for (let i = 0; i < items.length; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(processDevice));
        results.push(...batchResults);
        
        // Save progress every 5 batches
        if (i % (batchSize * 5) === 0) {
          await saveProgress(results);
        }
        
        if (i + batchSize < items.length) await setTimeout(delayMs);
      }
      return results;
    };

    // Process all devices
    const requests = await processBatch(devicesId);
    await saveProgress(requests); // Final save

    // Batch process the results
    const { error, data } = await batchRequest(requests, {
      batchSize: 500,
      delay: 2000,
    });

    if (error) {
      console.error("Batch processing error:", error);
    }

    // Transform data
    const dsnLists = data.map(item => ({
      id: item.id,
      version: item.version,
      deviceNumber: item.deviceNumber,
      androidId: item.androidId,
      deviceTypeId: item.deviceTypeId,
      manufacturer: item.manufacturer,
      maxInvoiceChunk: item.maxInvoiceChunk,
      minInvoiceLevel: item.minInvoiceLevel,
      isActivated: item.isActivated,
      isInitiated: item.isInitiated,
      isLocked: item.isLocked,
      deviceStatus: item.deviceStatus,
      bin: item.bin,
      // Uncomment if needed:
      // outletName: item.outlet?.outletNameEn || item.outlet?.outletNameBn,
      // outLetAddress: item.outlet?.addressLine1 || item.outlet?.addressLine2,
      // outletContact: item.outlet?.mobile || item.outlet?.phone,
      // officeName: item.office?.officeNameEn || item.office?.officeNameBn,
      ...(item.error && { error: item.error }) // Include error if present
    }));

    // Generate output
    const currentMoment = dateFormatter();
    console.log("Processing complete. Generating Excel file...");
    await convertToExcel(dsnLists, `devices-${currentMoment}`);
    console.log("Excel file generated successfully");

  } catch (error) {
    console.error("Critical error in dsnCount:", error);
    throw error;
  }
};

export default dsnCount;