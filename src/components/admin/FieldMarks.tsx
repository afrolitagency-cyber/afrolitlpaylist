/** Same marks on every create form. A star cannot be empty. Optional can. */
export function Req() {
  return <span className="text-(--primary)"> *</span>;
}

export function Opt() {
  return <span className="font-normal text-(--sub-text)"> — Optional</span>;
}
