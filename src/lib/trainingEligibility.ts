import { formationSchedules, footballElevenSchedules } from './trainingSchedules';

// 2026/27 age bands, cross-checked with https://www.cri.pt/?page_id=207
// and FPF's 2025/26 CO1 https://www.fpf.pt/DownloadDocument.ashx?id=30965.
// Club A/B allocation and ABC entry ages are deliberately not inferred.
export function findTrainingGroup(value: string, currentYear = new Date().getFullYear()) {
  const year = Number(value);
  if (!/^\d{4}$/.test(value) || year < currentYear - 100 || year > currentYear) return null;
  let label: string;
  let names: string[];
  let note = 'O escalão indicado corresponde ao ano de nascimento na época 2026/27. Contacte o clube para combinar o primeiro treino e confirmar a integração do atleta.';
  if (year >= 2022) {
    label = 'Primeiros passos no futebol'; names = ['ABCs'];
    note = 'O ABC é a iniciação ao futebol do clube. A idade de entrada e a integração em ABC ou Petizes precisam de confirmação com a coordenação. Estes são os horários publicados do ABC.';
  } else if (year >= 2020) { label = 'Petizes · Sub-7'; names = ['Petizes'];
  } else if (year >= 2018) { label = 'Traquinas · Sub-9'; names = ['Traquinas A', 'Traquinas B'];
  } else if (year >= 2016) { label = 'Benjamins · Sub-11'; names = ['Benjamins A', 'Benjamins B'];
  } else if (year === 2015) { label = 'Infantis · Sub-12'; names = ['Sub-12'];
  } else if (year === 2014) { label = 'Infantis · Sub-13'; names = ['Sub-13'];
  } else if (year >= 2012) { label = 'Iniciados · Sub-15'; names = ['Iniciados'];
  } else if (year >= 2010) { label = 'Juvenis · Sub-17'; names = ['Juvenis A', 'Juvenis B'];
  } else if (year >= 2008) { label = 'Juniores · Sub-19'; names = ['Juniores'];
  } else { label = 'Seniores'; names = ['Seniores']; }
  const schedules = names.map(name => [...formationSchedules, ...footballElevenSchedules].find(s => s.name === name)!);
  return { year, label, schedules, note, needsTeamConfirmation: names.length > 1 };
}
