
// Mock Firebase Timestamp to remove external dependency and increase stability
export class Timestamp {
    seconds: number;
    nanoseconds: number;

    constructor(seconds: number, nanoseconds: number) {
        this.seconds = seconds;
        this.nanoseconds = nanoseconds;
    }

    static fromDate(date: Date): Timestamp {
        const seconds = Math.floor(date.getTime() / 1000);
        const nanoseconds = (date.getTime() % 1000) * 1000000;
        return new Timestamp(seconds, nanoseconds);
    }

    toDate(): Date {
        return new Date(this.seconds * 1000 + this.nanoseconds / 1000000);
    }

    toMillis(): number {
        return this.seconds * 1000 + this.nanoseconds / 1000000;
    }
}


// =================================================================================
// TYPES
// =================================================================================

export enum FuelType {
    ETHANOL = 'ETANOL',
    GASOLINE = 'GASOLINA',
}

export interface RawFuelEntry {
    id: string;
    date: Timestamp;
    totalValue: number;
    pricePerLiter: number;
    kmEnd: number;
    fuelType: FuelType;
    notes: string;
}

export interface ProcessedFuelEntry extends Omit<RawFuelEntry, 'date'> {
    date: Date;
    liters: number;
    kmStart: number;
    distance: number;
    avgKmpl: number;
}

export interface MaintenanceData {
    oil: number;
    tires: number;
    engine: number;
}
