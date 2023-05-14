// fn statement{normal  }
fn1();
function fn1() {
    console.log(" I am normal function statement");
}
// fn expression {we assign the function and then we call it}
var fn2 = function () {
    console.log(" I am expression");
}

// arrow fn {same as normal function} 
var fn3 = () => {
    console.log(" I am arrow")
}

// IIFEE {a function that runs the moment it is invoked or called in the JavaScript event loop.}
// Immediately Invoked Function Expressions     
(function IIFEE() {

    console.log(" I am IIFEE");
})()