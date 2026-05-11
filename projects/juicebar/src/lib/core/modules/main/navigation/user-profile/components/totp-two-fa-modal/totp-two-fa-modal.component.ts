import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { FormControl, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { DialogRef, DIALOG_DATA } from '@angular/cdk/dialog';
import { Juice } from '../../../../../../shared/services/juice.service';
import { JuiceboxService } from '../../../../../../shared/services/Juicebox.service';
import { SharedModule } from '../../../../../../shared/shared.module';
import { MainTranslationPipe } from '../../../../i18n/main.translation';

export interface TotpDialogData {
  user: { _id: string };
}

@Component({
  selector: 'app-totp-two-fa-modal',
  templateUrl: './totp-two-fa-modal.component.html',
  styleUrls: ['./totp-two-fa-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, SharedModule, MainTranslationPipe]
})
export class TotpTwoFaModalComponent implements OnInit {
  private juice = inject(Juice);
  private juicebox = inject(JuiceboxService);
  public dialogRef = inject(DialogRef<{ success: boolean }>);
  public data: TotpDialogData = inject(DIALOG_DATA);

  protected readonly qrCode = signal<string>('');
  protected readonly secret = signal<string>('');
  protected readonly promiseBtn = signal<Promise<any> | null>(null);

  readonly twoFaForm = new FormGroup({
    code: new FormControl('', [
      Validators.required,
      Validators.pattern('^[0-9]*$'),
      Validators.minLength(6),
      Validators.maxLength(6)
    ])
  });

  async ngOnInit() {
    await this.generateCodes();
  }

  async generateCodes() {
    const result = await this.juice.request('juicebox:totp', 'generateSecretWithQrCode', [this.data.user._id]);
    if (!result?.success) {
      this.juicebox.showToast('error', 'Error', 'Can not generate code');
      return;
    }
    this.qrCode.set(result.payload.qrcode);
    this.secret.set(result.payload.secret);
  }

  submit() {
    if (this.twoFaForm.invalid) return;
    const promise = (async () => {
      const result = await this.juice.request('juicebox:totp', 'validateCodeFirstRun', [
        this.data.user._id,
        this.twoFaForm.value.code
      ]);
      if (!result?.success) {
        this.juicebox.showToast('error', 'Error', 'Can not set Authenticator app');
        return;
      }
      this.dialogRef.close({ success: true });
    })();
    this.promiseBtn.set(promise);
  }

  close() {
    this.dialogRef.close({ success: false });
  }
}
