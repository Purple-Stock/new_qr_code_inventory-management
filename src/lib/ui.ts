export const ui = {
  page: "min-h-screen bg-canvas text-ink",
  card: "rounded-xl border border-hairline bg-white shadow-rest",
  tableWrap: "overflow-hidden rounded-xl border border-hairline bg-white",
  tableHead: "bg-raised border-b border-hairline",
  th: "px-6 py-3 text-left text-xs font-medium text-ink-3",
  thRight: "px-6 py-3 text-right text-xs font-medium text-ink-3",
  pageTitle: "text-[28px] font-medium leading-[1.15] text-ink",
  pageSub: "text-sm text-ink-2",
  figure: "font-mono tabular-nums",
  navRow:
    "relative flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-ink-2 transition-colors duration-150 ease-craft",
  navRowActive: "bg-raised text-ink",
  navRowIdle: "hover:bg-raised hover:text-ink",
  empty: "rounded-xl border border-hairline bg-white px-6 py-16 text-center shadow-rest",
  emptyMark: "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-raised text-ink-3",
  modal: "max-h-[90vh] w-full overflow-y-auto rounded-xl border border-hairline bg-white shadow-float",
  modalHead: "flex items-center justify-between border-b border-hairline px-6 py-4",
  iconBtn:
    "flex h-9 w-9 items-center justify-center rounded-lg text-ink-3 transition-colors duration-150 ease-craft hover:bg-raised hover:text-ink",
} as const;
