import { Badge } from "@mantine/core";
import { useTranslation } from "react-i18next";

// Доступность дублируется атрибутом data-available: подпись в интерфейсе можно переписать,
// а состояние читается машиной по стабильному признаку (__data__/checklist.md).
export const AvailabilityBadge = ({
  available,
  testId,
}: {
  available: boolean;
  testId?: string;
}) => {
  const { t } = useTranslation();

  return (
    <Badge
      color={available ? "teal" : "gray"}
      variant={available ? "light" : "filled"}
      data-testid={testId}
      data-available={String(available)}
    >
      {available ? t(($) => $.availability.inStock) : t(($) => $.availability.outOfStock)}
    </Badge>
  );
};
