import { Component, OnInit, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ValidationErrors, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { JuiceboxService } from '../../../../../../shared/services/Juicebox.service';
import { UsersService } from '../../../../../users/users.service';
import { DialogService } from '../../../../../../../ui-components';
import { ConfirmationDialogComponent } from '../../../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import { TotpTwoFaModalComponent, TotpDialogData } from '../../components/totp-two-fa-modal/totp-two-fa-modal.component';
import { MainTranslationPipe } from '../../../../i18n/main.translation';
import { SharedModule } from '../../../../../../shared/shared.module';

interface IUserSettings {
  language?: string;
  twoFactor?: string;
  country?: string;
}

function passwordValidator(control: AbstractControl): ValidationErrors | null {
  const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*#?&:{}<>+-_()|~]{8,64}$/;
  return typeof control.value === 'string' && regex.test(control.value) ? null : { password: true };
}

function passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
  const pw = group.get('password')?.value;
  const repeat = group.get('repeatPassword')?.value;
  return pw && repeat && pw !== repeat ? { mismatch: true } : null;
}

@Component({
  selector: 'app-user-profile-details',
  templateUrl: './user-profile-details.component.html',
  styleUrls: ['./user-profile-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, SharedModule, MainTranslationPipe]
})
export class UserProfileDetailsComponent implements OnInit {
  private juicebox = inject(JuiceboxService);
  private usersService = inject(UsersService);
  private dialog = inject(DialogService);
  private i18n = new MainTranslationPipe(this.juicebox);

  protected readonly user = signal<any>(null);
  protected readonly languages = signal<Array<{ name: string; code: string }>>([]);
  protected readonly twoFactorTypes = signal<Array<any>>([]);
  protected readonly countries = signal<Array<any>>([]);
  protected readonly randomPassword = signal<string>('');
  protected readonly twoFactorApproved = signal<boolean>(false);

  readonly detailsForm = new FormGroup({
    firstname: new FormControl(''),
    lastname: new FormControl(''),
    email: new FormControl({ value: '', disabled: true })
  });

  readonly passwordForm = new FormGroup({
    currentPassword: new FormControl('', Validators.required),
    password: new FormControl('', [Validators.required, passwordValidator]),
    repeatPassword: new FormControl('', [Validators.required, passwordValidator])
  }, passwordMatchValidator);

  readonly settingsForm = new FormGroup({
    language: new FormControl<string | null>(null),
    twoFactor: new FormControl<string | null>(null),
    country: new FormControl<string | null>(null)
  });

  ngOnInit() {
    const u = this.juicebox.getUser();
    this.user.set(u);

    const settings: IUserSettings = u?.attributes?.settings ?? {};

    this.detailsForm.patchValue({
      firstname: u?.firstname ?? '',
      lastname: u?.lastname ?? '',
      email: u?.email ?? ''
    });

    const options = this.juicebox.getOptions();
    this.languages.set(options.languages?.length ? [...options.languages] : []);
    this.twoFactorTypes.set(options.twoFactor?.length ? [...options.twoFactor] : []);
    this.countries.set(options.countries?.length ? [...options.countries] : []);

    this.settingsForm.patchValue({
      language: settings.language ?? null,
      twoFactor: settings.twoFactor ?? null,
      country: settings.country ?? null
    });

    if (!settings.twoFactor) {
      this.twoFactorApproved.set(true);
    }

    this.juicebox.navigationEvent({
      location: this.i18n.transform('user_profile'),
      subject: null,
      link: null
    });
  }

  generateRandomPassword() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@$!%*#?&';
    let pwd = '';
    while (!passwordValidator({ value: pwd } as AbstractControl)) {
      pwd = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    }
    // ensure it passes: just generate a solid one
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@$!%*#?&';
    const all = upper + lower + digits + special;
    const random = (str: string) => str[Math.floor(Math.random() * str.length)];
    const base = random(upper) + random(lower) + random(digits) + random(special);
    const rest = Array.from({ length: 8 }, () => random(all)).join('');
    const generated = (base + rest).split('').sort(() => Math.random() - 0.5).join('');
    this.randomPassword.set(generated);
    this.passwordForm.patchValue({ password: generated, repeatPassword: generated });
  }

  async saveUserDetails() {
    this.detailsForm.markAllAsTouched();
    if (this.detailsForm.invalid) return;

    const result = await this.juicebox.updateUser(this.detailsForm.getRawValue() as any);
    if (result.success) {
      this.detailsForm.markAsPristine();
      this.juicebox.showToast('success', this.i18n.transform('user_details_saved'));
      window.location.reload();
    } else if (result.error) {
      this.juicebox.showToast('error', this.i18n.transform(result.error));
    }
  }

  async changePassword() {
    this.passwordForm.markAllAsTouched();
    if (this.passwordForm.invalid) return;

    const result = await this.juicebox.updatePassword(
      this.passwordForm.value.password,
      this.passwordForm.value.currentPassword
    );
    if (result.success) {
      this.passwordForm.reset();
      this.randomPassword.set('');
      this.juicebox.showToast('success', this.i18n.transform('password_changed'));
    } else {
      this.juicebox.showToast('error', this.i18n.transform('password_change_failed'));
    }
  }

  async saveSettings() {
    this.settingsForm.markAllAsTouched();
    if (this.settingsForm.invalid) return;

    const u = this.user();
    const result = await this.juicebox.saveUserSettings(u._id, this.settingsForm.value);
    if (result.success) {
      this.settingsForm.markAsPristine();
      this.juicebox.showToast('success', this.i18n.transform('user_settings_saved'));
      const fresh = await this.usersService.getUser(u._id);
      this.user.set(fresh.payload);
      window.location.reload();
    } else {
      this.juicebox.showToast('error', this.i18n.transform('user_settings_not_saved'));
    }
  }

  async setWalletAddress() {
    const u = this.user();
    await this.juicebox.updateUser({ wallet: u.wallet } as any);
  }

  onOpen2FADropdown() {
    if (this.twoFactorApproved()) return;

    const u = this.user();
    if (u?.attributes?.settings?.twoFactor) {
      const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
        data: {
          completeMessage: this.i18n.transform('user_already_has_2fa'),
          action: this.i18n.transform('update')
        }
      });
      dialogRef.closed.subscribe(async confirmed => {
        if (!confirmed) return;
        const result = await this.juicebox.resetTwoFactor();
        if (!result?.success) {
          this.juicebox.showToast('error', result?.error);
          return;
        }
        const fresh = await this.usersService.getUser(u._id);
        this.user.set(fresh.payload);
        this.twoFactorApproved.set(true);
      });
    }
  }

  on2FAChanged(twoFA: string) {
    if (twoFA !== 'totp') return;

    const dialogRef = this.dialog.open<TotpTwoFaModalComponent, TotpDialogData, { success: boolean }>(TotpTwoFaModalComponent, {
      disableClose: true,
      data: { user: this.user() }
    });
    dialogRef.closed.subscribe(res => {
      if (!res?.success) {
        this.settingsForm.patchValue({ twoFactor: null });
        return;
      }
      this.twoFactorApproved.set(true);
      this.juicebox.showToast('success', 'Two Factor updated');
    });
  }

  reset2fa() {
    const dialogRef = this.dialog.open<ConfirmationDialogComponent, any, boolean>(ConfirmationDialogComponent, {
      data: {
        completeMessage: this.i18n.transform('question_reset_2fa'),
        action: this.i18n.transform('reset')
      }
    });
    dialogRef.closed.subscribe(async confirmed => {
      if (!confirmed) return;
      const result = await this.juicebox.resetTwoFactor();
      if (!result?.success) {
        this.juicebox.showToast('error', result?.error);
        return;
      }
      const u = this.user();
      const fresh = await this.usersService.getUser(u._id);
      this.user.set(fresh.payload);
      this.settingsForm.patchValue({ twoFactor: null });
      this.twoFactorApproved.set(true);
    });
  }

  updateWallet(value: string) {
    this.user.update(u => ({ ...u, wallet: value }));
  }
}
