import batchRequest from "batch-request-js";
import "dotenv/config";
import convertToExcel from "./utils/convertToExcel.js";
import dateFormatter from "./utils/dateFormatter.js";
import { setTimeout } from 'timers/promises';
import https from 'https';
import { token } from "./token.js";
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

// Configure HTTP agent for connection pooling
const agent = new https.Agent({
  keepAlive: true,
  maxSockets: 50,
  timeout: 30000
});

// Enhanced fetch with retry logic
const fetchWithRetry = async (url, options, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await setTimeout(1000 * attempt); // Exponential backoff
    }
  }
};

const dsnCount = async (devicesId) => {
  try {
    console.log(`Starting processing for ${devicesId.length} devices...`);
    
    // Define the request function for batch-request-js
    const requestFunction = async (deviceId) => {
      try {
        const [deviceData, inUse] = await Promise.all([
          fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/devices/${deviceId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            agent
          }),
          fetchWithRetry(`https://efdmsapi.nbr.gov.bd/efdms/services/api/inventory/device-inuse/${deviceId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
            agent
          })
        ]);
        
        return {
          ...deviceData,
          deviceStatus: inUse ? "In use" : "Not in use"
        };
      } catch (error) {
        console.error(`Error processing device ${deviceId}:`, error.message);
        return { 
          id: deviceId,
          error: error.message 
        };
      }
    };

    // Process in batches with progress tracking
    const processInBatches = async (items, batchSize = 100) => {
      const results = [];
      let processed = 0;
      const total = items.length;
      
      for (let i = 0; i < total; i += batchSize) {
        const batch = items.slice(i, i + batchSize);
        
        const { data, error } = await batchRequest(batch, {
          request: requestFunction, // This is the critical fix
          batchSize: 50,
          delay: 1000
        });
        
        if (error) {
          console.error(`Batch ${i / batchSize + 1} had errors:`, error);
        }
        
        results.push(...data);
        processed = Math.min(i + batchSize, total);
        console.log(`Processed ${processed}/${total} devices (${Math.round(processed/total)*100}%)`);
        
        await setTimeout(2000); // Additional delay between batches
      }
      
      return results;
    };

    // Process all devices
    const results = await processInBatches(devicesId);

    // Transform results to final format
    const dsnLists = results.map(item => ({
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
      ...(item.error && { error: item.error })
    }));

    // Generate output
    console.log("Processing complete. Generating Excel file...");
    const currentMoment = dateFormatter();
    await convertToExcel(dsnLists, `devices-${currentMoment}`);
    console.log("Excel file generated successfully");

    return {
      success: true,
      totalProcessed: results.length,
      errorCount: results.filter(item => item.error).length
    };

  } catch (error) {
    console.error("Critical error in dsnCount:", error);
    throw error;
  }
};

export default dsnCount;