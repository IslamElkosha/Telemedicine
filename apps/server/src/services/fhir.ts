import { Device } from '@prisma/client';
import { DeviceType } from '@telemedicine/shared';

export async function mapToFHIR(device: Device, readingData: any) {
  const baseObservation = {
    resourceType: 'Observation',
    id: `reading-${Date.now()}`,
    status: 'final',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'vital-signs',
            display: 'Vital Signs'
          }
        ]
      }
    ],
    device: {
      reference: `Device/${device.id}`,
      display: `${device.make} ${device.model}`
    },
    effectiveDateTime: readingData.capturedAt || new Date().toISOString()
  };

  switch (device.type) {
    case DeviceType.BP:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '85354-9',
              display: 'Blood pressure panel with all children optional'
            }
          ]
        },
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8480-6',
                  display: 'Systolic blood pressure'
                }
              ]
            },
            valueQuantity: {
              value: readingData.payload.systolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          },
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8462-4',
                  display: 'Diastolic blood pressure'
                }
              ]
            },
            valueQuantity: {
              value: readingData.payload.diastolic,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]'
            }
          }
        ]
      };

    case DeviceType.SPO2:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '2708-6',
              display: 'Oxygen saturation in Arterial blood'
            }
          ]
        },
        valueQuantity: {
          value: readingData.payload.spo2,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%'
        }
      };

    case DeviceType.THERMO:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8310-5',
              display: 'Body temperature'
            }
          ]
        },
        valueQuantity: {
          value: readingData.payload.temperature,
          unit: readingData.payload.unit === 'fahrenheit' ? '°F' : '°C',
          system: 'http://unitsofmeasure.org',
          code: readingData.payload.unit === 'fahrenheit' ? '[degF]' : 'Cel'
        }
      };

    case DeviceType.ECG:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8867-4',
              display: 'Heart rate'
            }
          ]
        },
        valueQuantity: {
          value: readingData.payload.heartRate,
          unit: 'beats/min',
          system: 'http://unitsofmeasure.org',
          code: '/min'
        },
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8625-6',
                  display: 'Heart rhythm'
                }
              ]
            },
            valueString: readingData.payload.rhythm || 'Normal Sinus'
          }
        ]
      };

    case DeviceType.GLUCO:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '33747-0',
              display: 'Glucose measurement'
            }
          ]
        },
        valueQuantity: {
          value: readingData.payload.glucose,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL'
        }
      };

    case DeviceType.STETH:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '364075005',
              display: 'Heart sound'
            }
          ]
        },
        valueString: readingData.payload.soundType || 'Heart sounds recorded',
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8867-4',
                  display: 'Heart rate'
                }
              ]
            },
            valueQuantity: {
              value: readingData.payload.heartRate,
              unit: 'beats/min',
              system: 'http://unitsofmeasure.org',
              code: '/min'
            }
          }
        ],
        derivedFrom: readingData.payload.audioUrl ? [
          {
            reference: readingData.payload.audioUrl,
            display: 'Audio recording'
          }
        ] : undefined
      };

    case DeviceType.ULTRASOUND:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '16310003',
              display: 'Ultrasonography'
            }
          ]
        },
        valueString: `Ultrasound imaging - ${readingData.payload.mode || 'B-Mode'}`,
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://snomed.info/sct',
                  code: '363698007',
                  display: 'Imaging depth'
                }
              ]
            },
            valueQuantity: {
              value: readingData.payload.depth,
              unit: 'cm',
              system: 'http://unitsofmeasure.org',
              code: 'cm'
            }
          }
        ],
        derivedFrom: readingData.payload.imageUrl ? [
          {
            reference: readingData.payload.imageUrl,
            display: 'Ultrasound image'
          }
        ] : undefined
      };

    default:
      return {
        ...baseObservation,
        code: {
          coding: [
            {
              system: 'http://snomed.info/sct',
              code: '364075005',
              display: 'Medical device reading'
            }
          ]
        },
        valueString: JSON.stringify(readingData.payload)
      };
  }
}