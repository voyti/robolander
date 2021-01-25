import { Injectable } from '@angular/core';
import _ from 'lodash';

@Injectable({
  providedIn: 'root'
})
export class DrawingService {

  constructor() { }

  redrawLand(land, landY) {
    land.lineStyle(2, 0xcccccc, 1);
    land.beginFill(0xaa4f08);
    land.drawRect(0, landY, 1530, 100);
    land.endFill();
  }

  redrawLander(lander, landerW, landerH) {
    lander.clear();
    lander.beginFill(0x333333);
    lander.drawRect(0, 0, landerW, landerH);
    lander.endFill();
  }

  /**
   *
   * @param landerFlame
   * @param intensity - max 100
   */
  redrawFlame(landerFlame, intensity, landerW, landerH) {
    const flameColors = [0xff3300, 0xcc3211];
    landerFlame.clear();

    if (intensity > 0) {
      landerFlame.beginFill(_.sample(flameColors));
      landerFlame.lineStyle(4, 0xffd900, 1);
      landerFlame.moveTo(0, landerH);
      landerFlame.lineTo(landerW, landerH);
      landerFlame.lineTo(landerW / 2, landerH + intensity * 100);
      landerFlame.lineTo(0, landerH); // last 50 here is intensity
      landerFlame.closePath();
      landerFlame.endFill();
    }
  }

  drawHelperLinesForHeights(helperLines, heights, groundPoint) {
    helperLines.clear();

    _.forEach(heights, (height) => {
      helperLines.beginFill(0x88ef65);
      helperLines.drawRect(1, Number(height) - groundPoint, 200, 2);
      helperLines.endFill();
    });
  }

  drawStruts(struts, landerW, landerH) {
    struts.clear();

    struts.beginFill(0xddd900);
    struts.lineStyle(2, 0xddd900, 1);
    struts.moveTo(0, landerH);
    struts.lineTo(-10, landerH + 5);
    struts.lineTo(-15, landerH + 7);
    struts.lineTo(-5, landerH + 7);
    struts.lineTo(-10, landerH + 5);

    struts.closePath();
    struts.endFill();

    struts.moveTo(landerW, landerH);
    struts.lineTo(landerW + 10, landerH + 5);
    struts.lineTo(landerW + 15, landerH + 7);
    struts.lineTo(landerW + 5, landerH + 7);
    struts.lineTo(landerW + 10, landerH + 5);

    struts.closePath();
    struts.endFill();
  }

  resetStruts(struts) {
    struts.clear();
  }
}
