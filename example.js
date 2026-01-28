function bmicalculator(weight, height) {
    if (height <= 0) {
        throw new Error("Height must be greater than zero.");
    }
    const bmi = weight / (height * height);
    return bmi;



}


console.log(bmicalculator(70, 0)); // Example usage
