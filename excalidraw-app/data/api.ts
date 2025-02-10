const sleep = (time: number) =>
  new Promise((resolve) => setTimeout(resolve, time));

export const loadFilesFromStorage = async () => {
  await sleep(1000);
  const decryptedElements = [{"id":"KSIEZEFYCyEd8abFGZIWp","type":"rectangle","x":-849.731770833333,"y":-1213.5644523082547,"width":1293.57421875,"height":892.51953125,"angle":0,"strokeColor":"#2f9e44","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"index":"a0","roundness":{"type":3},"seed":1182150122,"version":28,"versionNonce":818719850,"isDeleted":false,"boundElements":[],"updated":1738767229318,"link":null,"locked":false},{"id":"fFsVNiaxBz85d4aaPwTAJ","type":"rectangle","x":-351.54231770833303,"y":-933.4257804332547,"width":230.5,"height":189.54296875,"angle":0,"strokeColor":"#1e1e1e","backgroundColor":"transparent","fillStyle":"solid","strokeWidth":2,"strokeStyle":"solid","roughness":1,"opacity":100,"groupIds":[],"frameId":null,"index":"a1","roundness":{"type":3},"seed":536428472,"version":19,"versionNonce":84555464,"isDeleted":false,"boundElements":null,"updated":1738767386976,"link":null,"locked":false}];
  return decryptedElements;
};