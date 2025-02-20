export const fetchEnv = async (): Promise<{ [key: string]: string }> => {
  return fetch("/env.json")
    .then((res) => res.json())
    .catch((e) => console.error("Cannot fetch env.json file"));
};
