//Todo commnanNodeインスタンスを使って、データを保管、伝えていく

const config = {
    endPointUrl:"https://openlibrary.org/search.json",
    user:"ryo8998",
    inputTarget:document.getElementById("cli-input"),
    outputTarget: document.getElementById("cli-output-container"),
    applicationName : "Btools",
    maxResult:100,
}

// データ構造
class CommandNode{
    constructor(commandInputString){ // String
        this.commandInputString = commandInputString;
        this.down = null;
        this.up = null;
        this.isValid = null;
        this.errorMessage = null;
        this.search = {query:"",results:[]}
        this.parsedStringInputArray = null;
        this.applicationName = null;
        this.command = null;
        this.argument = null;
        this.commnadLineParser();
        this.validator()
    }
    //getter
    getParsedStringInputArray(){return this.parsedStringInputArray;}
    getValidation(){return this.isValid;}
    getErrorMessage(){return this.errorMessage;}
    getCommandInput(){return this.commandInputString;}
    getCommand(){return this.command;}
    getArgument(){return this.argument;}
    getSearchResults(){return this.search.results}

    //setter

    setValidation(isValid){ this.isValid = isValid;}
    setParsedStringInputArray(parsedStringInputArray){ this.parsedStringInputArray = parsedStringInputArray;}
    setErrorMessage(errorMessage){ this.errorMessage = errorMessage;}
    setResults(results){ this.search.results = results;}


    commnadLineParser(){ 
        this.parsedStringInputArray = this.commandInputString.trim().split(" ");
        this.applicationName = this.parsedStringInputArray[0];
        this.command = this.parsedStringInputArray[1];
        this.argument = this.argumentParser(this.parsedStringInputArray.slice(2));
    }

    argumentParser(argumentArr){ // Array
        let arg = {};
        arg.maxResult = argumentArr[1]? parseInt(argumentArr[1]): config.maxResult;
        switch(this.command){
            case "searchByTitle":
                arg.title = argumentArr[0];
                break
            case "searchByAuthor":
                arg.author = argumentArr[0];
                break
            case "searchByIsbn":
                arg.isbn = argumentArr[0];
                break
        }
        return arg;
    }

    validator(){
        if(this.applicationName!==config.applicationName){
            console.log(this.applicationName);
            this.setValidation(false);
            this.setErrorMessage(`You must start with ${config.applicationName}`)
        } 
        else if(this.parsedStringInputArray.length === 1) {
            this.setValidation(false);
            this.setErrorMessage(`You need to input some command like ${Model.validCommandList.join(', ')}`)
        }
        else if(this.parsedStringInputArray.length >=2 && Model.validCommandList.indexOf(this.command)<0) {
            this.setValidation(false);
            this.setErrorMessage('No such Command('+this.command+')')
        }
        else if(this.parsedStringInputArray.length === 2) {
            this.setValidation(false);
            this.setErrorMessage(`You need to input some query`);
        }
        else{
            this.setValidation(true);
            this.setErrorMessage("");
        }
    }
}

class CommandLine{
    constructor() {
        this.top = null;
        this.bottom = null;
    }

    push(commandNodeObj){ // commandNodeObj -> void
        if(this.top === null){
            this.top = commandNodeObj;
            this.bottom = this.top;
        }else{
            let newNode = commandNodeObj;
            let tmp = this.top;
            this.top = newNode;
            newNode.down = tmp;
            newNode.down.up = newNode;
        }
        this.setIteratorToTop();
    }

    pop(){ // -> String
        if(this.top === null) return null;
        let tmp = this.top;
        this.top = this.top.down;
        return tmp.commandInputString
    }

    peek(){ // -> String
        if(this.top === null) return null;
        return this.top.commandInputString
    }

    setIteratorToTop(){
        this.iterator = this.top;
    }
}




class Model{

    static validCommandList = ["searchByTitle","searchByAuthor","searchByISBN"];

    static loadSearchResults = async (commandNodeObj) =>{ //String
        let query = commandNodeObj.argument.isbn ? `isbn=${commandNodeObj.argument.isbn}`: "";
        query = commandNodeObj.argument.title ? `title=${commandNodeObj.argument.title}`: query;
        query = commandNodeObj.argument.author? `author=${commandNodeObj.argument.author}` : query;
        const res = await fetch(`https://openlibrary.org/search.json?${query}`);
        const data = await res.json();
    
        if(!res.ok) throw new Error(`${data.message} ${res.status}`);
    
        let results = data.docs.map(ele =>{
            return {
            author:ele.author_name,
            title:ele.title,
            publishedYear:ele.first_publish_year,
            isbn:ele.isbn
            }
        });
        commandNodeObj.setResults(results);
    }

}

class View{

    static renderCommand(commandNodeObj){ //commandLineObj -> void
        config.outputTarget.innerHTML += `
        <p class="text-white my-0">
        <span style='color:green'>${config.user}</span>
        <span style='color:magenta'>@</span>
        <span style='color:blue'>recursionist</span>
        : ${commandNodeObj.getCommandInput()}     
        </p>
        `    
    }
    static clearInput(){
        config.inputTarget.value = ""; 
    }

    static clearOutput(){
        config.outputTarget.innerHTML = "";
    }

    static renderResult(commandNodeObj){ //String, boolean -> void
        if(commandNodeObj.search.results.length===0){
            config.outputTarget.innerHTML +=  `<p class="text-white my-0">No results found</p>`
        }
        config.outputTarget.innerHTML += `
        <p class="text-white my-0">
        <span style='color:${commandNodeObj.getValidation()?"turquoise":"red"}'>${config.applicationName}${commandNodeObj.getValidation()?"":"Error"}</span>
        : ${commandNodeObj.getErrorMessage()}     
        </p>
        `
        config.outputTarget.innerHTML += commandNodeObj.getValidation()?` <p class="text-white my-0">Found ${commandNodeObj.getSearchResults().length} results</p>`:"";
        for(let result of commandNodeObj.getSearchResults().slice(0,commandNodeObj.argument.maxResult)){
            config.outputTarget.innerHTML += `
            <p class="text-white my-0">
             <span style='color:orange'>Title:</span> ${result.title}
             <span style='color:orange'>Author:</span> ${result.author} 
             <span style='color:orange'>Year:</span> ${result.publishedYear}
             </p>`
        }
        if(commandNodeObj.getSearchResults().length > commandNodeObj.argument.maxResult){
            config.outputTarget.innerHTML +=`
            <p class="text-white my-0">${commandNodeObj.getSearchResults().length - commandNodeObj.argument.maxResult} books are not shown</p>
            `
        }
    }
    static renderHistoryCommand(command){ // String -> void
        config.inputTarget.value = command;
    }

    static addHandlerCommand(handler){ //function
        config.inputTarget.addEventListener('keypress',function(e){
            if(!this.value) return;
            if(e.key === "Enter") handler(this.value);
        })
    }

    static addHandlerHistory(handler){ //function
        config.inputTarget.addEventListener("keydown",function(e){
            handler(e);
        })
    }

    static addHandlerClearOutput(){
        config.inputTarget.addEventListener("keypress",function(e){
            if(e.key==="Enter"&&this.value==="clear") {
                View.clearOutput();
                View.clearInput();
            }
        })
    }
}



class Controller{

    static controlCommand = async function(command){ //String
        let commandNodeObj = new CommandNode(command);
        cl.push(commandNodeObj);
        if(!commandNodeObj.getValidation()) {
            View.renderCommand(commandNodeObj);
            View.renderResult(commandNodeObj);
            View.clearInput();
            return;
        }else{
            View.renderCommand(commandNodeObj);
            View.clearInput();
            await Model.loadSearchResults(commandNodeObj);
            View.renderResult(commandNodeObj);
        }        
    }

    static controllHistroyCommand = function(event){
        if(event.key=="ArrowUp"){
            if(cl.iterator){
                View.renderHistoryCommand(cl.iterator.commandInputString);
                cl.iterator = cl.iterator.down? cl.iterator.down : cl.iterator;
            }
        }
        if(event.key == "ArrowDown"){
            if(cl.iterator.up){
                cl.iterator = cl.iterator.up;
                View.renderHistoryCommand(cl.iterator.commandInputString);
            }
        }
    }

    static init = function(){
        View.addHandlerClearOutput();
        View.addHandlerCommand(this.controlCommand);
        View.addHandlerHistory(this.controllHistroyCommand);
    }
}


Controller.init()
let cl = new CommandLine();