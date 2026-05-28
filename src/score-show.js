import { AlphaTabApi, LayoutMode} from '@coderline/alphatab'
import { play } from './midi-visual';

const element=document.getElementById('score-element');
let alphaTabApi=null;


alphaTabApi=new AlphaTabApi(element,{
    core: {
        file: '/public/qifengle.musicxml',
        fontDirectory: '/public/font/',
        tracks:[0,1],
        
      },        
        display:{
            LayoutMode:'page',
            stretchForce:0.8,
        },
        
     player: {  
        
        enablePlayer: true,
        enableCursor: true,
        enableUserInteraction: true,
        scrollMode:'OffScreen',
        scrollElement:"#score-container",
      //   soundFont: '/public/soundfont/sonivox.sf2'
      }
})
document.getElementById('scoreplay').onclick=()=>{alphaTabApi.playPause();
    play();
}


