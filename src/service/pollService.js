//paste link to article where i found this polling function TODO
export async function poll(retrieveResponse, fnCondition, ms) {
    let result = await retrieveResponse();
    while (fnCondition(result)) {
      await wait(ms);
      result = await retrieveResponse();
    }
    return result;
  }

  function wait(ms = 500) {
    return new Promise(resolve => {
      console.log(`waiting ${ms} ms...`);
      setTimeout(resolve, ms);
    });
  }
  