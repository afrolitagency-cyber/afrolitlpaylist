import editorial from "../editorial";
import Header from "./Header";
import Hero from "./Hero";
import type { ThemeComponents } from "../types";

const theme: ThemeComponents = { ...editorial, Header, Hero };
export default theme;
