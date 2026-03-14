import path from "node:path";

export const loader = async () => {
    // From the Node docs on path.resolve(): 
    // If no path segments are passed, path.resolve() will return
    // the absolute path of the current working directory.
    const projectRoot = path.resolve()
    const jsonData = {
       workspace: {
           root: projectRoot,
           uuid: 'my-uuid-xxx',
       }
    };
    return Response.json(jsonData);
};