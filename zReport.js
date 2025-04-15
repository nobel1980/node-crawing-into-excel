import "dotenv/config";

const generateZReport = () => {
  const bodyFormat = {
    bin: "003703758-0101",
    fileFormat: "pdf",
    fromDate: "2024-08-01",
    orderBy: "asc",
    pageCode: "TRIS",
    toDate: "2024-08-15",
    zoneId: 39780,
    zoneName: "Zone-1",
  };
  const token = process.env.TOK;
  console.log(JSON.stringify(bodyFormat), "ppp");
  const url = `${process.env.URL}/services/api/reports/v1/zeroreport`;
  fetch(url, {
    method: "POST",
    headers: {
      Referer: "https://efdms.nbr.gov.bd/",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyFormat),
  })
    .then((response) => {
      console.log(response, "xx");
    })
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error("There was a problem with the fetch operation:", error);
    });
};

generateZReport();
