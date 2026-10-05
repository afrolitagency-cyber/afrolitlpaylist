import editorial from "../editorial";
import Header from "./Header";
import Hero from "./Hero";
import ArticleCard from "./ArticleCard";
import type { ThemeComponents } from "../types";

const theme: ThemeComponents = { ...editorial, Header, Hero, ArticleCard };
export default theme;
