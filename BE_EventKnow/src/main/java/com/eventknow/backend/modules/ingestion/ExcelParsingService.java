package com.eventknow.backend.modules.ingestion;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.*;

@Service
public class ExcelParsingService {

    public record RowData(int rowNumber, Map<String, String> data) {
    }

    public record SheetData(String sheetName, List<String> headers, List<RowData> rows) {
    }

    public List<SheetData> parseWorkbook(byte[] fileBytes) throws IOException {
        List<SheetData> sheets = new ArrayList<>();
        DataFormatter dataFormatter = new DataFormatter();

        try (Workbook workbook = new XSSFWorkbook(new ByteArrayInputStream(fileBytes))) {
            for (int s = 0; s < workbook.getNumberOfSheets(); s++) {
                Sheet sheet = workbook.getSheetAt(s);
                String sheetName = sheet.getSheetName();

                int lastRowNum = sheet.getLastRowNum();
                if (lastRowNum < 0) {
                    continue; // Empty sheet
                }

                // First row is headers
                Row headerRow = sheet.getRow(0);
                if (headerRow == null) {
                    continue;
                }

                List<String> headers = new ArrayList<>();
                int maxCol = headerRow.getLastCellNum();
                for (int c = 0; c < maxCol; c++) {
                    Cell cell = headerRow.getCell(c);
                    String headerVal = cell == null ? "" : dataFormatter.formatCellValue(cell).trim();
                    headers.add(headerVal);
                }

                List<RowData> rows = new ArrayList<>();
                for (int r = 1; r <= lastRowNum; r++) {
                    Row row = sheet.getRow(r);
                    if (row == null) {
                        continue;
                    }

                    Map<String, String> rowMap = new LinkedHashMap<>();
                    boolean hasData = false;
                    for (int c = 0; c < maxCol; c++) {
                        Cell cell = row.getCell(c);
                        String cellVal = cell == null ? "" : dataFormatter.formatCellValue(cell);
                        String header = c < headers.size() ? headers.get(c) : "Column_" + c;

                        rowMap.put(header, cellVal);
                        if (!cellVal.trim().isEmpty()) {
                            hasData = true;
                        }
                    }

                    if (hasData) {
                        rows.add(new RowData(r + 1, rowMap)); // human row index (1-based)
                    }
                }

                sheets.add(new SheetData(sheetName, headers, rows));
            }
        }
        return sheets;
    }
}
