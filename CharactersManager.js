function Character(name,speechColour){
    
    this.name = name;
    // RenJS.characters[this.name] = this;
    this.looks = {};
    this.currentLook = null;
    this.speechColour = speechColour;
    this.lastScale = 1;

    this.addLook = function(lookName,image){        
        var look = RenJS.storyManager.characterSprites.create(config.positions.CENTER.x,config.positions.CENTER.y,(image ? image : lookName));
        look.anchor.set(0.5,1);
        look.alpha = 0;
        look.name = lookName;
        this.looks[lookName] = look;
        if (!this.currentLook){
            this.currentLook = this.looks[lookName];
        }
    }
}

function CharactersManager(){
    this.characters = {};
    this.showing = {};
    
    this.add = function(name,displayName,speechColour,looks){
        this.characters[name] = new Character(displayName,speechColour);
        for (const look in looks){
            this.characters[name].addLook(look,name+"_"+look);
        }
    }

    this.show = function(name,transition,props){        
        var ch = this.characters[name];
        var oldLook = ch.currentLook;
        ch.currentLook = props.look ? ch.looks[props.look] : ch.looks.normal;

        if (!props.position){
            props.position = (oldLook != null) ? {x:oldLook.x,y:oldLook.y} : config.positions.CENTER;
        }
        if (props.flipped != undefined){
            ch.lastScale = props.flipped ? -1 : 1;
        }
        this.showing[name] = {look: ch.currentLook.name,position:props.position,flipped:(ch.lastScale==-1)};
        return transition(oldLook,ch.currentLook,props.position,ch.lastScale,RenJS.storyManager.characterSprites);
    }

    this.hide = function(name,transition){
        var ch = this.characters[name];
        var oldLook = ch.currentLook;        
        ch.currentLook = null;
        delete this.showing[name];
        return transition(oldLook,null);
    }

    this.set = function (showing) {
        this.hideAll(RenJS.transitions.CUT);
        this.showing = showing;
        for (const name in this.showing){
            var props = this.showing[name];
            var character = this.characters[name];
            character.currentLook = character.looks[props.look];
            character.currentLook.x = props.position.x; 
            character.currentLook.y = props.position.y;
            character.currentLook.scaleX = props.flipped ? -1 : 1;
            character.currentLook.alpha = 1;
        }
    }

    this.hideAll = function(transition){
        if (!transition) transition = RenJS.transitions.FADEOUT;
        return new Promise(function(resolve,reject){
            var promises = []
            for (const char in RenJS.chManager.showing){
                promises.push(RenJS.chManager.hide(char,transition));
            }
            Promise.all(promises).then(resolve);
        });
    }

    this.isCharacter = function(actor){
        return actor in this.characters || actor == "CHARS" || actor == "ALL";
    }

}
