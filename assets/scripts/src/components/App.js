// React
import React, { Component } from 'react';

// Utilities
import { capitalise, stripHTML } from '../libs/utils';
import merge from 'lodash/merge';

// Components
import StartScreen from './StartScreen';
import NumberArea from './NumberArea';
import ScoreBoard from './ScoreBoard';
import ModeSwitcher from './ModeSwitcher';
import GameControls from './GameControls';

// Configs
import { EN, DE } from '../config/languages';
import { modes } from '../config/modes';
import { diacriticMap } from '../config/diacritics';

const REMAINING_TIME = 60000;
const DEFAULT_STATE = {
    currentMode: modes[0],
    answerAttempts: 0,
    score: 0,
    previousScore: 0,
    personalBest: 0,
    currentNumber: [],
    mute: false,
    remainingTime: REMAINING_TIME,
    gameStarted: false,
    controls: []
}

class Numberwang extends Component {

    constructor(props) {
        super(props);

        let SAVED_STATE = null;

        if(localStorage.getItem('NumberwangState') !== null) {
            SAVED_STATE = JSON.parse(localStorage.NumberwangState);
        }

        this.state = SAVED_STATE || DEFAULT_STATE;
    }

    componentDidMount() {
        this.endGame();
    };

    componentDidUpdate(prevProps, prevState) {
        localStorage.NumberwangState = JSON.stringify(this.state);
    };

    startTimer = () => {
        this.remainingTimer = setInterval(() => {
            let remainingTime = this.state.remainingTime - 1000;
            if(remainingTime < 0) {
                this.endGame();
            } else {
                this.setState({
                    remainingTime
                })
            }
        }, 1000);
    };

    startGame = () => {
        let controls = [
            { name: 'End', action: this.endGame, active: true },
            { name: 'Restart', action: this.restartGame, active: true },
            { name: 'Mute', action: this.toggleGameAudio, active: true },
            { name: 'Unmute', action: this.toggleGameAudio, active: false }
        ];

        // Don't override controls if user has a saved state already
        if(localStorage.getItem('NumberwangState') !== null) {
            let savedState = JSON.parse(localStorage.NumberwangState);
            controls = merge(controls, savedState.controls);
        }

        let numbers = this.getNewNumbers(1);

        let newState = {
            answerAttempts: 0,
            score: 0,
            currentNumber: numbers[0],
            controls,
            gameStarted: true
        }

        return this.setState(newState, () => {
           this.startTimer(); 
        });
    };

    endGame = () => {
        let newState = {
            gameStarted: false,
            previousScore: this.state.score,
            currentNumber: [],
            remainingTime: REMAINING_TIME
        };

        clearInterval(this.remainingTimer);
        this.setState(newState);
    };

    restartGame = () => {
        let numbers = this.getNewNumbers(1);

        let newState = {
            answerAttempts: 0,
            previousScore: this.state.score,
            score: 0,
            currentNumber: numbers[0],
            remainingTime: REMAINING_TIME
        };

        localStorage.removeItem('NumberwangState');
        clearInterval(this.remainingTimer);
        this.setState(newState, () => {
            this.startTimer();
        });
    };

    toggleGameAudio = () => {
        let controls = [
            { name: 'End', action: this.endGame, active: true },
            { name: 'Restart', action: this.restartGame, active: true },
            { name: 'Mute', action: this.toggleGameAudio, active: this.state.mute ? true : false },
            { name: 'Unmute', action: this.toggleGameAudio, active: this.state.mute ? false : true }
        ];

        let newState = {
            mute: this.state.mute ? false : true,
            controls
        }

        this.setState(newState);
    };

    setGameMode = (newMode) => {
        let newState = {
            currentMode: newMode[0],
        }

        this.setState(newState, function(){
            let numbers = this.getNewNumbers(1);
            return this.setState({
                currentNumber: numbers[0],
                answerAttempts: 0
            })
        });
    };

    handleGameModeChange = (event) => {
        let selectedMode = modes.filter(function(mode) {
            return mode.name == event.currentTarget.value;
        });

        this.setGameMode(selectedMode);
    };

    translateNumber = (num, lang, direction = 'forwards', space = true) => {
        let whitespace = space ? ' ' : '';

        let convertMillions = function(num) {
            if (num >= 1000000) {
                return convertMillions(Math.floor(num / 1000000)) + whitespace + lang.million + whitespace + convertThousands(num % 1000000);
            } else {
                return convertThousands(num);
            }
        }

        let convertThousands = function(num) {
            if (num >= 1000) {
                return convertHundreds(Math.floor(num / 1000)) + whitespace + lang.thousand + whitespace + convertHundreds(num % 1000);
            } else {
                return convertHundreds(num);
            }
        }

        let convertHundreds = function(num) {
            if (num > 99) {
                if(direction === 'forwards') {  
                    return lang.ones[Math.floor(num / 100)] + whitespace + lang.hundred + whitespace + lang.join + whitespace + convertTens(num % 100);
                } else {
                    return lang.ones[Math.floor(num / 100)] + whitespace + lang.hundred + whitespace + convertTens(num % 100);
                }
            } else {
                return convertTens(num);
            }
        }

        let convertTens = function(num) {
            if (num < 10) return lang.ones[num];
            else if (num >= 10 && num < 20) {
                return lang.teens[num - 10];
            } else {
                if(direction === 'forwards') {  
                    return lang.tens[Math.floor(num / 10)] + whitespace + lang.ones[num % 10];
                } else {
                    if(num % 10 === 0) { 
                        // If number is divisible by ten
                        return lang.tens[Math.floor(num / 10)];
                    } else { 
                        return lang.ones[num % 10] + whitespace + lang.join + whitespace + lang.tens[Math.floor(num / 10)]; 
                    }
                }
            }
        }

        let convert = function(num) {
            if (num == 0) return "zero";
            else return convertMillions(num);
        }

        return convert(num);
    };

    getNewNumbers = (limit) => {
        let numbers = []
        let numberLimit = limit || 1;
        let numberCount = 0;
        let numberRange = this.state.currentMode.numberRange;

        let getRandomNumber = function(min, max) {
            return Math.floor(Math.random() * (max - min) + min);
        };

        let fillNumbersArray = function(){
            while(numberCount < numberLimit) {
                let number = getRandomNumber(1, numberRange);

                // If number doesn't already exist in numbers array
                // otherwise get a new one
                if(numbers.indexOf(number) === -1) {
                    numbers.push({
                        digits: number,
                        questionLanguage: capitalise(this.translateNumber(number, EN, 'forwards', true)),
                        answerLanguage: capitalise(this.translateNumber(number, DE, 'backwards', false)),
                    });

                    numberCount++;
                } else {
                    fillNumbersArray();
                }
            }  
        }.bind(this);

        fillNumbersArray();

        return numbers;
    };

    removeDiacritics = (string) => {
        diacriticMap.forEach(function(element, index) {
            string = string.replace(diacriticMap[index].letters, diacriticMap[index].base);
        });
        
        return string;
    };

    handleSuccess = (answer) => {
        // Get new numbers
        let numbers = this.getNewNumbers(1);
        // Increment score 
        let score = this.state.score + this.state.currentMode.multiplier;
        // Increment timer
        let remainingTime = this.state.remainingTime + (this.state.currentMode.multiplier * 1000);

        // If game hasn't been muted
        if(!this.state.mute) {
            // Play sound
            let audio = new Audio('../assets/audio/success.mp3');
            audio.play();
        }

        let newState = {
            personalBest: score > this.state.personalBest ? score : this.state.personalBest,
            answerAttempts: 0,
            currentNumber: numbers[0],
            score,
            remainingTime
        }

        return this.setState(newState);
    };

    handleFailure = () => {
        this.setState({
            answerAttempts: this.state.answerAttempts + 1
        });

        if(!this.state.mute) {
            let audio = new Audio('../assets/audio/incorrect-1.mp3');
            audio.play();
        }
    };

    isCorrect = (response, answer) => {
        let responseSanitised = response.toLowerCase();
        let answerSanitised = answer.answerLanguage.toLowerCase();

        return (responseSanitised === answerSanitised || responseSanitised === this.removeDiacritics(answerSanitised)) ? true : false;
    };

    answer = (response, answer) => {
        let responseSanitised = stripHTML(response);
        if (this.isCorrect(responseSanitised, answer)) {
            this.handleSuccess(answer);
        } else if(response) {
            this.handleFailure();
        }
    };

    render() {
        return (
            <numberwang className="window">
                {(!this.state.gameStarted) && (
                    <StartScreen previousScore={ this.state.previousScore } personalBest={ this.state.personalBest } startGame={ this.startGame } />
                )}
                {(this.state.gameStarted) && (
                    <div>
                        <header className="header">
                            <GameControls controls={ this.state.controls } />
                            <ModeSwitcher modes={ modes } changeMode={ this.handleGameModeChange } currentMode={ this.state.currentMode.name }/>
                        </header>
                        <NumberArea score={ this.state.score } personalBest={ this.state.personalBest } remainingTime={ this.state.remainingTime } answerAttempts={ this.state.answerAttempts } answer={ this.answer } number={ this.state.currentNumber }/>
                    </div>
                )}
            </numberwang>
        );
    };
};

export default Numberwang;