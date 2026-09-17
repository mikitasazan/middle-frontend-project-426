import { AspectRatio, Center, Image, Text } from "@mantine/core";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Product } from "../api";

// Изображение товара необязательно (контракт: imageUrl — Optional). Вместо пустого места
// и «битой» картинки показываем заглушку — в том числе когда картинка не загрузилась.
// Пропорции фиксированы: иначе карточки в сетке скачут по высоте.
export const ProductImage = ({ product, ratio = 4 / 3 }: { product: Product; ratio?: number }) => {
  const { t } = useTranslation();
  // Храним не флаг, а адрес, который не загрузился: тогда смена товара сбрасывает состояние
  // сама, без эффекта на изменение пропа.
  const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
  const url = product.imageUrl;

  return (
    <AspectRatio ratio={ratio} bg="gray.0">
      {!url || brokenUrl === url ? (
        <Center>
          <Text c="dimmed" size="sm">
            {t(($) => $.product.noImage)}
          </Text>
        </Center>
      ) : (
        <Image src={url} alt={product.name} fit="cover" onError={() => setBrokenUrl(url)} />
      )}
    </AspectRatio>
  );
};
