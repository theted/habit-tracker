export const generateRandom = (max = 100, num = 12) => {
  return new Array(num).fill(0).map(() => Math.round(Math.random() * max))
}

export const fillArray = (
  input: Record<number, number>,
  length: number,
  replace = 0
): number[] => {
  const days = new Array(length).fill(0).map((_, i) => i)
  return days.map((hour) => (hour in input ? input[hour]! : replace))
}

export const countOccurrences = (items: number[]): Record<number, number> => {
  const counts: Record<number, number> = {}
  items.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1
  })

  return counts
}

export const shuffle = <T>(unshuffled: T[]) =>
  unshuffled
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
