import editorial from "../editorial";
import Header from "./Header";
import type { ThemeComponents } from "../types";

/** Centred differs in the masthead only; the body shares Editorial's grid. */
const theme: ThemeComponents = { ...editorial, Header };
export default theme;
