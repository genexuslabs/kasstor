export const prettyTimeMark = (elapsedTime: number): string => {
  if (elapsedTime < 1000) {
    return `${elapsedTime.toFixed(2)} ms`;
  }
  return `${(elapsedTime / 1000).toFixed(2)} s`;
};
