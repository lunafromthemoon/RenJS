function LogicManager(){

    this.vars = {};

    var log = localStorage.getItem("RenJSChoiceLog"+globalConfig.name);

    this.choicesLog = log ? JSON.parse(log) : {};

    this.currentChoices = [];

    this.set = function(vars){
        this.vars = vars;
        this.currentChoices = [];
        this.interrupting = false;
        if (this.visualChoices){
            this.visualChoices.destroy();
        }
    }
    
    this.setVar = function(name,value){
        value = value+"";
        value = this.parseVars(value);
        try {
           var val = eval(value);
           this.vars[name] = val;
        } catch(e) {
            this.vars[name] = value;
        }
    }

    this.evalExpression = function(expression){
        expression = expression+"";
        expression = this.parseVars(expression,true);
        try {
            return eval(expression);
        } catch(e) {
            console.log("couldn-t eval");
            return false;
        }
    }

    this.branch = function(expression,branches){
        var val = this.evalExpression(expression);
        var actions;
        if (val && branches.ISTRUE){
            actions = branches.ISTRUE;
        } 
        if (!val && branches.ISFALSE){
            RenJS.control.execStack[0].c++;
            actions = branches.ISFALSE;
        }
        if(actions){
            RenJS.storyManager.currentScene = actions.concat(RenJS.storyManager.currentScene);
            RenJS.control.execStack.unshift({c:-1,total: actions.length, action: "if"});
        }        
    }

    this.parseVars = function(text,useQM){
        var vars = text.match(/\{(.*?)\}/g);
        console.log(vars)
        if (vars) {
            for (const v of vars){
                var varName = v.substring(1,v.length-1);
                console.log(varName)
                var value = this.vars[varName]
                console.log(varName)
                if (useQM && typeof value == "string"){
                    value = '\"'+value+'\"';
                }
                text = text.replace(v,value);
            }
        }
        return text;
    }

    this.evalChoice = function(choice){
        var choiceText = Object.keys(choice)[0];
        choice.choiceId = "Choice"+guid();
        choice.choiceText = choiceText;
        var params = choiceText.split("!if");
        if (params.length > 1){
            var val = RenJS.logicManager.evalExpression(params[1]);
            if (val) {
                var next = choice[choiceText];
                delete choice[choiceText];
                choice.choiceText = params[0];
                choice[params[0]] = next;
            }
            return val;
        }
        return true; //unconditional choice
    }

    this.showVisualChoices = function(choices){
        // clone
        var ch = choices.map(choice => ({...choice}));
        // filter (eval choice modifies the choice adding id and clearing text)
        this.currentChoices = ch.filter(this.evalChoice,this);
        this.visualChoices = game.add.group();
        var execId = RenJS.logicManager.getExecStackId();
        for (var i = 0; i < this.currentChoices.length; i++) {
            var key = Object.keys(this.currentChoices[i])[0];
            var str = key.split(" ");
            var pos = str[2].split(",");
            var position = {x:parseInt(pos[0]),y:parseInt(pos[1])};
            this.createVisualChoice(str[0],position,i,key,execId);
        }
    }

    this.createVisualChoice = function(image,position,index,key,execId) {
        var button = game.add.button(position.x,position.y,image,function(){
            RenJS.logicManager.choose(index,key,execId);
        },RenJS.logicManager,0,0,0,0,this.visualChoices);
        if (RenJS.gui.getChosenOptionColor && RenJS.logicManager.choicesLog[execId].indexOf(key) != -1){
            button.tint = RenJS.gui.getChosenOptionColor();
            // previously chosen choice
        }
        button.anchor.set(0.5);
    }

    this.getExecStackId = function() {
        var cAction = RenJS.control.execStack[RenJS.control.execStack.length-1].c;
        var cScene = RenJS.control.execStack[RenJS.control.execStack.length-1].scene;
        var execId = "Scene:"+cScene+"|Action:"+cAction
        if (!RenJS.logicManager.choicesLog[execId]){
            RenJS.logicManager.choicesLog[execId]=[];
        }
        return execId;
    }

    this.showChoices = function(choices){
        var ch = choices.map(choice => ({...choice}));
        ch = ch.filter(this.evalChoice,this);
        RenJS.logicManager.currentChoices = RenJS.logicManager.currentChoices.concat(ch);    
        // Update choice log 
        var execId = RenJS.logicManager.getExecStackId();
        // END Update choice log
        RenJS.gui.showChoices(RenJS.logicManager.currentChoices,execId); 
    }

    this.interrupt = function(steps,choices){
        this.interrupting = true;
        var s = parseInt(steps);
        if (!isNaN(s) && s>0){
            choices.forEach(choice => {
                choice.remainingSteps = s+1;
                choice.interrupt = true;
            })
            RenJS.onInterpretActions.interruptAction = function(){
                RenJS.logicManager.currentChoices = RenJS.logicManager.currentChoices.filter(choice => {
                    if (choice.remainingSteps) {
                        choice.remainingSteps--;
                        if (choice.remainingSteps==1){
                            RenJS.gui.changeToLastInterrupt(choice.choiceId); 
                        } else if (choice.remainingSteps==0){
                            RenJS.gui.hideChoice(choice.choiceId); 
                            return false;
                        }
                    }
                    return true;
                },this);
                if (RenJS.logicManager.currentChoices.length == 0){
                    delete RenJS.onInterpretActions.interruptAction;
                }
            }    
        }
        var execId = RenJS.logicManager.getExecStackId();
        this.showChoices(choices,execId);
        RenJS.control.execStack[0].interrupting = RenJS.control.execStack[0].c;
    }

    this.clearChoices = function(){
        RenJS.gui.hideChoices();
        RenJS.logicManager.currentChoices = [];
        RenJS.logicManager.interrupting = false;
        if (RenJS.logicManager.visualChoices){
            RenJS.logicManager.visualChoices.destroy();
        }
    }

    this.choose = function(index,chosenOption,execId){
        RenJS.logicManager.choicesLog[execId].push(chosenOption);
        if (RenJS.logicManager.visualChoices){
            RenJS.logicManager.visualChoices.destroy();
        }
        if (chosenOption){
            var actions = RenJS.logicManager.currentChoices[index][chosenOption];
            RenJS.storyManager.currentScene = actions.concat(RenJS.storyManager.currentScene);
            RenJS.control.execStack.unshift({c:-1,index:index,op:chosenOption,total:actions.length,action:"choice"});
        }
        RenJS.logicManager.currentChoices = [];
        if (RenJS.logicManager.interrupting){
            RenJS.control.execStack[0].action = "interrupt";
            RenJS.logicManager.interrupting = false;
        } else {
            RenJS.resolve();
        }
    }
}

function guid() {
  return "ss".replace(/s/g, s4);
}

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
}