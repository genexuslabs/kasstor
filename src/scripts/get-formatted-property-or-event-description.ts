export const getFormattedPropertyOrEventDescription = (
  description: string | undefined
) => `/**
     * ${description?.split("\n").join("\n     * ") ?? ""}
     */`;
