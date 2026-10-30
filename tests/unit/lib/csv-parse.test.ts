// @vitest-environment node
import { describe, expect, it } from "vitest";
import { CsvParseError, csvCell, parseCsv, toCsv } from "@/lib/csv/parse-csv";

describe("parseCsv", () => {
  it("reads headers and rows", () => {
    expect(parseCsv("email,full_name\na@x.co,Asha Rao\nb@x.co,Ben Roy\n")).toEqual([
      ["email", "full_name"],
      ["a@x.co", "Asha Rao"],
      ["b@x.co", "Ben Roy"],
    ]);
  });

  it("handles CRLF, lone CR, a missing final newline and blank lines", () => {
    expect(parseCsv("a,b\r\n1,2\r\n\r\n3,4")).toEqual([["a", "b"], ["1", "2"], ["3", "4"]]);
    expect(parseCsv("a,b\r1,2\r")).toEqual([["a", "b"], ["1", "2"]]);
  });

  it("keeps commas, line breaks and doubled quotes inside quoted values", () => {
    expect(parseCsv('name,note\n"Rao, Asha","line1\nline2"\n"He said ""hi""",ok')).toEqual([
      ["name", "note"],
      ["Rao, Asha", "line1\nline2"],
      ['He said "hi"', "ok"],
    ]);
  });

  it("keeps empty cells, including a trailing one", () => {
    expect(parseCsv("a,b,c\n1,,3\n,,\n4,5,")).toEqual([["a", "b", "c"], ["1", "", "3"], ["", "", ""], ["4", "5", ""]]);
  });

  it("strips a UTF-8 byte-order mark and keeps non-ASCII text", () => {
    expect(parseCsv("﻿email,full_name\nप्रिया@x.co,Priyā Śarmā")).toEqual([["email", "full_name"], ["प्रिया@x.co", "Priyā Śarmā"]]);
  });

  it("returns nothing for an empty or whitespace-free-blank input", () => {
    expect(parseCsv("")).toEqual([]);
    expect(parseCsv("\n\n")).toEqual([]);
  });

  it.each([
    ["an unterminated quote", 'a,b\n"unclosed,2'],
    ["a quote in the middle of a value", 'a,b\nab"c,2'],
    ["text after a closing quote", 'a,b\n"x"y,2'],
  ])("refuses %s instead of guessing", (_label, input) => {
    expect(() => parseCsv(input)).toThrow(CsvParseError);
  });
});

describe("writing CSV safely", () => {
  it("quotes values with commas, quotes and line breaks", () => {
    expect(csvCell('a,"b"')).toBe('"a,""b"""');
    expect(csvCell("x\ny")).toBe('"x\ny"');
    expect(csvCell("plain")).toBe("plain");
  });

  it("defuses spreadsheet formulas", () => {
    for (const bad of ["=SUM(A1)", "+1", "-2", "@cmd", "\tx"]) expect(csvCell(bad).startsWith("'")).toBe(true);
  });

  it("round-trips through parseCsv", () => {
    const rows = [["email", "full_name"], ["a@x.co", 'Rao, "Asha"'], ["b@x.co", ""]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
