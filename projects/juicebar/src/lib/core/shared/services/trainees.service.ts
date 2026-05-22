import { inject, Injectable } from '@angular/core';
import { Juice } from './juice.service';
import { Result } from '../types/Result';
import { Trainee } from '../models/trainee.model';

@Injectable({ providedIn: 'root' })
export class TraineesService {
    private juice = inject(Juice);

    fetchAllTraineesWithoutUserProfile(organisationId: string): Promise<Result<Trainee[]>> {
        return this.juice.request(
            'trainee:service',
            'fetchTraineesWithoutUserProfile',
            [organisationId]
        );
    }
}
