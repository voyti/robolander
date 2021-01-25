import { Component, OnInit } from "@angular/core";
import * as PIXI from "pixi.js";
import * as _ from "lodash";
import { DrawingService } from "./services/drawing.service";
import { LanguageService } from "./services/language.service";

const START_X = 500;
const START_Y = 0;

const LOOP_PERIOD = 50;
const IDLE_MOVEMENT_ACTING_ENERGY = 0.1;
const PLANET_ACCEL = 1.625; // m/s2; Moon;
const PX_TO_M = 1;
const LAND_Y = 950;
const WIDTH = 2000;
const HEIGHT = 1000;

const LANDER_W = 30;
const LANDER_H = 50;

const BURN_BASE_VALUE = 0.05;
const MIN_SAFE_CUM_DOWNWARD = 2;
const MIN_SAFE_CUM_DOWNWARD_PRECEDE = 1; // add acceptable speed when extending struts
const LANDING_MIN_ADD_H = 50;


// TODO: buy additional conditions, buy sensors, side platforms and engines to avoid, moving platform to land, land condition (within 10 sec etc), fuel
@Component({
  selector: "app-root",
  templateUrl: "./app.component.html",
  styleUrls: ["./app.component.scss"]
})
export class AppComponent implements OnInit {
  title = "Robolander";
  x = START_X;
  y = START_Y;

  direction = 0; // 0 is up, 90 i right
  momentum = 0;
  isSpontaneusEnergySuppressed = false;
  actingEnergy = 0;
  energyBar: PIXI.Graphics;
  momentumBar: PIXI.Graphics;
  lander: PIXI.Graphics;
  upcomingReleaseOfSpontaneusEnergy: any;
  land: PIXI.Graphics;
  cumullativeDownward: number = 0;
  displayCumullativeDownward: number = 0;
  landerGroup: PIXI.Container;
  landerFlame: PIXI.Graphics;
  pendingBurn: number = 0;
  burn: number = 0;
  burnStack: number = 0;
  steeringRules: { conditionVariable: string; operator: string; conditionValue: string; actionVariable: string; actionValue: string; id: string; isEnabled: boolean; }[];
  currentCodeFromRules: string | void;
  landY: number;
  conditionVariables: string[];
  actionVariables: string[];
  operators: string[];
  error: string;
  helperLines: PIXI.Graphics;
  MIN_SAFE_CUM_DOWNWARD: number;
  landingStruts: PIXI.Graphics;
  hasWon: boolean;
  landingSpeed: number;
  hasLost: boolean;
  landerH: number;

  constructor(private drawingService: DrawingService, private languageService: LanguageService) {
    this.landY = LAND_Y;

    this.steeringRules = [{
      id: '0',
      conditionVariable: 'distanceToGround',
      operator: '<',
      conditionValue: '600',
      actionVariable: 'thrustLevel',
      actionValue: '1',
      isEnabled: true,
    }];

    this.conditionVariables = ['distanceToGround'];
    this.actionVariables = ['thrustLevel'];
    this.operators = ['<', '===', '>'];
  }

  ngOnInit(): void {
    this.start();
    this.initInputController();

    this.initGameLoop();
    this.currentCodeFromRules = '';
    this.onRulesChanged();

    this.landerH = LANDER_H;
  }

  getCodeFromRules() {
    console.log(this.steeringRules);
    let code = '';
    const enabledRules = _.filter(this.steeringRules, 'isEnabled');

    code = _.map(enabledRules, (rule) => {
      return `
if (${rule.conditionVariable} ${rule.operator} ${rule.conditionValue}) {
  ${rule.actionVariable} = ${rule.actionValue};
}`;
    }).join('\n');

    code = `
    ${code}\n\nreturn { ${_.uniq(_.map(this.steeringRules, 'actionVariable')).join(', ')} };
    `;

    return code;
  }

  onRulesChanged() {
    this.currentCodeFromRules = this.getCodeFromRules();
    this.drawHelperLinesForHeights();
  }

  drawHelperLinesForHeights() {
    const heightRules = _.filter(this.steeringRules, ['conditionVariable', 'distanceToGround']);
    this.drawingService.drawHelperLinesForHeights(this.helperLines, _.map(heightRules, 'conditionValue'), this.landY);
  }

  addNewRule() {
    this.steeringRules.push({
      conditionVariable: 'distanceToGround',
      operator: '<',
      conditionValue: '1000',
      actionVariable: 'thrustLevel',
      actionValue: '1',
      id: Math.random().toString(16).substring(2),
      isEnabled: true,
    });
    this.onRulesChanged();
  }

  removeRule(ruleId) {
    this.steeringRules = _.reject(this.steeringRules, ['id', ruleId]);
    this.onRulesChanged();
  }

  supressSpontaneusEnergy() {
    clearTimeout(this.upcomingReleaseOfSpontaneusEnergy);

    this.isSpontaneusEnergySuppressed = true;
    this.upcomingReleaseOfSpontaneusEnergy = setTimeout(() => {
      this.isSpontaneusEnergySuppressed = false;
    }, LOOP_PERIOD * 10);
  }

  start() {
    let type = "WebGL";
    if (!PIXI.utils.isWebGLSupported()) {
      type = "canvas";
    }

    PIXI.utils.sayHello(type);

    const app = new PIXI.Application({
      // antialias: true,
      backgroundColor: 0xffffff,
      width: WIDTH,
      height: HEIGHT
      // legacy: true,
    });

    this.lander = new PIXI.Graphics();
    this.landerFlame = new PIXI.Graphics();
    this.landerGroup = new PIXI.Container();
    this.landingStruts = new PIXI.Graphics();

    this.energyBar = new PIXI.Graphics();
    this.momentumBar = new PIXI.Graphics();
    this.land = new PIXI.Graphics();


    this.landerGroup.addChild(this.lander);
    this.landerGroup.addChild(this.landerFlame);
    this.landerGroup.addChild(this.landingStruts);

    this.helperLines = new PIXI.Graphics();

    app.stage.addChild(this.landerGroup);
    app.stage.addChild(this.energyBar);
    app.stage.addChild(this.momentumBar);
    app.stage.addChild(this.land);

    this.drawingService.redrawLand(this.land, LAND_Y);
    document.body.appendChild(app.view);
  }


  initInputController() {
    const steeringInputKeys = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight"
    ];

    document.body.addEventListener("keydown", (e) => {
      if (_.includes(steeringInputKeys, e.key)) {
        e.preventDefault();

        // if (e.key === "ArrowUp") {
        //   this.registerBurn();
        // }
        // if (e.key === "ArrowDown") {
        //   this.registerKillBurn();
        // }
      }
    });
  }

  registerBurn() {
    this.pendingBurn = 1;
  }

  registerKillBurn() {
    if (this.burnStack > 0) this.burnStack--;
  }

  registerMomentumChange(change, clamp?) {
    if (clamp && change < 0 && this.momentum - change < 0) {
      this.momentum = 0;
    } else {
      this.momentum += change;
    }
  }

  registerBraking(impulse) {
    if (this.momentum > 0) this.registerMomentumChange(-impulse);
    this.actingEnergy = IDLE_MOVEMENT_ACTING_ENERGY;
  }

  performMovement() {
    this.y = this.y + this.cumullativeDownward;
  }

  registerGravityInfluence() {
    this.cumullativeDownward =
      this.cumullativeDownward + PLANET_ACCEL * PX_TO_M * (LOOP_PERIOD / 1000);
  }

  applyBurnStack() {
    const MAX_BURN_STACK = 10;

    if (this.burnStack < MAX_BURN_STACK) {
      this.burnStack++;
    }
  }

  applyBurnForce() {
    this.burn = BURN_BASE_VALUE * this.burnStack;
    this.cumullativeDownward -= this.burn;
  }

  initGameLoop() {
    let loopCount = 0;

    setInterval(() => {
      if (this.hasLost) return null;

      this.checkAndApplyRules();
      this.registerGravityInfluence(); // friction
      if ((this.y + LANDER_H) >= (LAND_Y - LANDING_MIN_ADD_H)  && this.cumullativeDownward <= (MIN_SAFE_CUM_DOWNWARD + MIN_SAFE_CUM_DOWNWARD_PRECEDE)) {
        this.drawingService.drawStruts(this.landingStruts, LANDER_W, LANDER_H);
      }
      if ((this.y + LANDER_H) >= LAND_Y && this.cumullativeDownward <= MIN_SAFE_CUM_DOWNWARD) this.win();
      if ((this.y + LANDER_H) >= LAND_Y) this.lose();

      if (this.pendingBurn) {
        this.applyBurnStack();
        this.applyBurnForce();
        this.pendingBurn = 0;
      } else {
        if (this.burnStack) {
          this.applyBurnStack();
          this.applyBurnForce();
          this.burnStack--;
        }
      }

      this.performMovement();
      this.drawingService.redrawLander(this.lander, LANDER_W, LANDER_H);

      this.landerGroup.position.x = this.x;
      if (this.hasWon) {
        this.landerGroup.position.y = LAND_Y;
      } else {
        this.landerGroup.position.y = this.y;
      }

      this.drawingService.redrawFlame(this.landerFlame, this.burn, LANDER_W, LANDER_H);

      loopCount++;
      if (loopCount % 10 === 0) {
        this.displayCumullativeDownward = this.cumullativeDownward;
        // console.warn(this.cumullativeDownward);
      }

      if (this.hasWon) {
        this.y = this.landY + LANDER_H;
      }
    }, LOOP_PERIOD);
  }

  checkAndApplyRules() {
    if (this.currentCodeFromRules && this.currentCodeFromRules.length) {
      this.error = '';

      const distanceToGround = LAND_Y - (this.y + LANDER_H);
      let thrustLevel;
      try {
        const ruleFunction = new Function("distanceToGround", "thrustLevel", this.currentCodeFromRules);

        const results = ruleFunction(distanceToGround);
        this.burnStack = results.thrustLevel || 0;
      } catch(e) {
        debugger;
        this.error = e.message;
      }
    }
  }

  reset() {
    this.y = 0;
    this.cumullativeDownward = 0;
    this.burn = 0;
    this.burnStack = 0;
    this.hasWon = false;
    this.hasLost = false;
    this.drawingService.resetStruts(this.landingStruts);
    this.landingSpeed = 0;
  }

  lose() {
    this.hasLost = true;
    this.landingSpeed = this.cumullativeDownward;
  }

  win() {
    this.hasWon = true;
    this.landingSpeed = this.cumullativeDownward;
  }

  t(wordOrSentence) {
    return this.languageService.en2pl(wordOrSentence);
  }
}
