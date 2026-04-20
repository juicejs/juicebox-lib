import {Component, Inject, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';

export interface HelpDialogData {
  text?: string;
}
import {MainTranslationPipe} from '../../i18n/main.translation';
import {HelperService} from '../../../../shared/services/helper.service';
import {ConfirmationDialogComponent, ConfirmationDialogData} from '../../../../shared/components/confirmation-dialog/confirmation-dialog.component';
import {JuiceboxService} from '../../../../shared/services/Juicebox.service';
import {Router} from '@angular/router';

@Component({
    selector: 'app-help',
    templateUrl: './help.component.html',
    styleUrls: ['./help.component.scss']
})
export class HelpComponent implements OnInit {

    fileInfo: {name: string, extension: string, type: string, path: string};
    file: File;

    helpData: { text: string };

    i18n: MainTranslationPipe;
    promiseBtn;

    helpTextUpdated: boolean = false;

    constructor(public dialogRef: MatDialogRef<HelpComponent>,
                @Inject(MAT_DIALOG_DATA) public data: HelpDialogData,
                public juicebox: JuiceboxService,
                private dialog: MatDialog,
                private helper: HelperService,
                private juiceboxService: JuiceboxService,
                private router: Router) {
      this.i18n = new MainTranslationPipe(this.juicebox)
    }

    async ngOnInit() {
        await this.getFileInfo();
        await this.getHelpText();
    }

    private async getFileInfo() {
        const result = await this.juicebox.getHelpFileInfo(this.router.url.split("/")[2], this.juicebox.getLanguage());
        this.fileInfo = result && result.success ? result.payload : null;
    }

    uploadFile(input: HTMLInputElement) {
        // @ts-ignore
      this.promiseBtn = (async () => {

            if (!this.file) {
                return await this.helper.pause();
            }

            console.log("this.file");
            console.log(this.file);

            if (this.file.size > 20971520) {
                this.file = null;
                input.value = null;
                this.juiceboxService.showToast('error', 'File larger than 20MB');
                return await this.helper.pause();
            }

            const result = await this.juicebox.uploadHelpFile(this.router.url.split("/")[2], this.juicebox.getLanguage(), this.file.name, this.file.type, this.file);
            if (result && result.success) {
                this.juiceboxService.showToast('success', this.i18n.transform('file_uploaded'));
                await this.getFileInfo();
                this.file = null;
                input.value = null;
            } else {
                this.juiceboxService.showToast('error', this.i18n.transform('file_upload_failed'));
            }
        })();
    }

    async downloadFile() {
        const result = await this.juicebox.downloadHelpFile(this.router.url.split("/")[2], this.juicebox.getLanguage());
        if (!result) {
            this.juiceboxService.showToast('error', 'File not found');
        }
    }

    deleteFile() {
        const dialogData: ConfirmationDialogData = {
            action: 'delete',
            subject: this.fileInfo.name + this.fileInfo.extension
        };
        
        const dialogRef = this.dialog.open(ConfirmationDialogComponent, {
            width: '400px',
            data: dialogData
        });
        
        dialogRef.afterClosed().subscribe(async (result) => {
            if (result) {
                const deleteResult = await this.juicebox.deleteHelpFile(this.router.url.split("/")[2], this.juicebox.getLanguage());
                if (deleteResult) {
                    this.juiceboxService.showToast('success', this.i18n.transform('file_deleted'));
                } else {
                    this.juiceboxService.showToast('error', this.i18n.transform('file_delete_failed'));
                }
                await this.getFileInfo();
            }
        });
    }

    async addHelpText(text) {
        const url = this.router.url;
        const splitUrl = url.split('/');
        const module = splitUrl[2]
        const data = {
            module: module,
            text: text,
            language: this.juicebox.getLanguage()
        }
        const result = await this.juicebox.addHelpText(data)

        if (result && result.success) {
            this.juiceboxService.showToast("success", this.i18n.transform('text_updated'));
            this.helpTextUpdated = true;
        } else {
            this.juiceboxService.showToast("error", this.i18n.transform('text_update_failed'));
        }
    }

    async getHelpText() {
        const url = this.router.url;
        const splitUrl = url.split('/');
        const module = splitUrl[2]
        const result = await this.juicebox.getHelpText(module)
        this.helpData = result && result.success ? result.payload.text[this.juicebox.getLanguage()] : null;
    }
}
