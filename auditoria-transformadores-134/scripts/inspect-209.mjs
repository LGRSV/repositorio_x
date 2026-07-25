import { FileBlob, SpreadsheetFile } from "@oai/artifact-tool";

const files = process.argv.slice(2);

for (const file of files) {
  const workbook = await SpreadsheetFile.importXlsx(await FileBlob.load(file));
  console.log(`\nFILE ${file}`);
  for (const sheet of workbook.worksheets.items) {
    const used = sheet.getUsedRange(true);
    const values = used?.values ?? [];
    console.log(`SHEET ${sheet.name} ROWS ${values.length} COLS ${values[0]?.length ?? 0}`);
    console.log(JSON.stringify(values.slice(0, 3), null, 2));
  }
}
