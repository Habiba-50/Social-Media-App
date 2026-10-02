export const createNumberOtp = async () : Promise<string> => {
  return Math.floor(Math.random() * (999999 - 100000 + 1) + 100000).toString();
};
