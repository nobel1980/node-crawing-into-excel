import XLSX from "xlsx";

const convertToExcel = async (allData, title) => {
  if (allData.length > 0) {
    const flattenedData = allData.flat();
    // Convert the flattened array to a worksheet
    const worksheet = XLSX.utils.json_to_sheet(flattenedData);
    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    // Append the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    // Export the Excel file
    await XLSX.writeFile(workbook, `${title}.xlsx`);

    console.log("Excel File Created Successfully! 🙂");
  } else {
    throw new Error("No Data Found!");
  }
};

export default convertToExcel;
