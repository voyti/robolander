import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {

  constructor() { }

  en2pl(wordOrSentence) {
    return {
      'CASH': 'GOTÓWKA',
      'LANDER VALUE': 'WARTOŚĆ LĄDOWNIKA',
      'V SPEED': 'PRĘDKOŚĆ PION.',
      'LANDER Y': 'WYSOKOŚĆ NAD POW.',

      '+ ADD RULE': '+ DODAJ WARUNEK',
      'GENERATED CODE': 'WYGENEROWANY KOD',

      'Land at 2 m/s or less!': 'Wyląduj z prędkością nie większą niż 2 m/s!',
    }[wordOrSentence] || wordOrSentence;
  }
}
