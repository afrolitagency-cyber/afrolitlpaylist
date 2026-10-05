import editorial from "../editorial";
import Header from "./Header";
import Hero from "./Hero";
import SectionHead from "./SectionHead";
import type { ThemeComponents } from "../types";

const theme: ThemeComponents = { ...editorial, Header, Hero, SectionHead };
export default theme;
