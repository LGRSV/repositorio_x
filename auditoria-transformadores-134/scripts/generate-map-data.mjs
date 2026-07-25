import fs from "node:fs";

const source = "/tmp/municipios-brasileiros.csv";
const target = new URL("../public/municipios-to.json", import.meta.url);

const rows = fs.readFileSync(source, "utf8").trim().split(/\r?\n/).slice(1);
const municipalities = rows
  .map((row) => {
    const [ibge, name, latitude, longitude, capital, stateCode] = row.split(",");
    return {
      ibge,
      name,
      latitude: Number(latitude),
      longitude: Number(longitude),
      capital: capital === "1",
      stateCode,
    };
  })
  .filter((item) => item.stateCode === "17")
  .map((item) => ({
    ibge: item.ibge,
    name: item.name,
    latitude: item.latitude,
    longitude: item.longitude,
    capital: item.capital,
  }));

fs.writeFileSync(target, `${JSON.stringify(municipalities, null, 2)}\n`);
console.log(`Mapa municipal gerado: ${municipalities.length} municípios.`);
