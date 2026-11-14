/// <reference path="../.astro/types.d.ts" />
// Atributos declarativos de WebMCP (https://developer.chrome.com/docs/ai/webmcp)
declare namespace astroHTML.JSX {
  interface FormHTMLAttributes {
    toolname?: string;
    tooldescription?: string;
    toolautosubmit?: boolean | string;
  }
  interface InputHTMLAttributes {
    toolparamdescription?: string;
  }
  interface TextareaHTMLAttributes {
    toolparamdescription?: string;
  }
  interface SelectHTMLAttributes {
    toolparamdescription?: string;
  }
}
