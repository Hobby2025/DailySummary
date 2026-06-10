me,
    lastWeekText: formatNumberedList(row.lastWeekItems),
    thisWeekText: formatNumberedList(row.thisWeekItems),
  }));
}

export function formatNumberedList(items: string[]) {
  if (items.length === 0) {
    return "";
  }

  return items.map((item, index) => `${index + 1}. ${item}`).join("\n");
}

export function formatShortDateRange(start: string, end: string) {
  const [, startMonth, startDay] = start.split("-");
  const [, endMonth, endDay] = end.split("-");

  return `${Number(startMonth)}/${Number(startDay)} ~ ${Number(endMonth)}/${Number(endDay)}`;
}

export function addDays(value: string, amount: number) {
  assertDa