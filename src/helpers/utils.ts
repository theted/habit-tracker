export const generateRandom = (max = 100, num = 12) => {
  return new Array(num).fill(0).map(() => Math.round(Math.random() * max))
}

export const fillArray = (input: any[], length: Number, replace = 0): any[] => {
  const days = new Array(length).fill(0).map((h, i) => i)
  return days.map((hour, i) => (hour in input ? input[hour] : replace))
}

export const countOccurrences = (items: any[]): { [key: any]: number } => {
  const counts: { [key: number]: number } = {}
  items.forEach((item) => {
    counts[item] = (counts[item] || 0) + 1
  })

  return counts
}

export const shuffle = (unshuffled: any[]) =>
  unshuffled
    .map((value) => ({ value, sort: Math.random() }))
    .sort((a, b) => a.sort - b.sort)
    .map(({ value }) => value)
