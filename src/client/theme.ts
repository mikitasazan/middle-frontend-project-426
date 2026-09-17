import {
  Anchor,
  Badge,
  Button,
  Card,
  Checkbox,
  createTheme,
  NativeSelect,
  Paper,
  TextInput,
  Title,
} from "@mantine/core";

// Единый визуальный язык магазина живёт здесь, а не в пропсах по всему коду: акцентный цвет,
// радиусы и типографику меняют в одном месте. Дефолты компонентов заданы через theme.components,
// поэтому страницы описывают структуру, а не оформление.
export const theme = createTheme({
  primaryColor: "indigo",
  primaryShade: { light: 6, dark: 8 },
  defaultRadius: "md",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontWeight: "700",
    sizes: {
      h1: { fontSize: "2rem", lineHeight: "1.2" },
      h2: { fontSize: "1.5rem", lineHeight: "1.3" },
      h3: { fontSize: "1.125rem", lineHeight: "1.4" },
    },
  },
  components: {
    Title: Title.extend({ defaultProps: { c: "dark.7" } }),
    Card: Card.extend({
      defaultProps: { withBorder: true, radius: "lg", padding: "lg" },
    }),
    Paper: Paper.extend({ defaultProps: { radius: "lg" } }),
    Button: Button.extend({ defaultProps: { radius: "md" } }),
    Anchor: Anchor.extend({ defaultProps: { underline: "never" } }),
    Badge: Badge.extend({ defaultProps: { radius: "sm" } }),
    TextInput: TextInput.extend({ defaultProps: { size: "md" } }),
    NativeSelect: NativeSelect.extend({ defaultProps: { size: "md" } }),
    Checkbox: Checkbox.extend({ defaultProps: { size: "md" } }),
  },
});
