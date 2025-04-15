import fs from "fs";

const convertToJson = (allData, title) => {
  const jsonString = JSON.stringify(allData, null, 2);
  fs.writeFile(`${title}.json`, jsonString, (err) => {
    if (err) {
      console.error("Error writing JSON to file", err);
    } else {
      console.log("JSON file has been created successfully.");
    }
  });
};

export default convertToJson;
