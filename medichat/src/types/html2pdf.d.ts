declare module 'html2pdf.js' {
  const html2pdf: (() => {
    set: (opt: object) => {
      from: (el: HTMLElement) => { save: () => Promise<unknown> };
    };
  }) & ((src: string | HTMLElement, opt?: object) => Promise<unknown>);
  export default html2pdf;
}
