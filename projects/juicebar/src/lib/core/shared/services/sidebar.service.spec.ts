import {inject, InjectionToken} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {of} from 'rxjs';
import {BASE_APP_CONFIG, BaseAppConfig, SidebarCountConfig} from '../../../config/base-app.config';
import {Juice} from './juice.service';
import {JuiceboxService} from './Juicebox.service';
import {SidebarItem, SidebarService} from './sidebar.service';

const PROJECT_API = new InjectionToken<{open: number}>('PROJECT_API');

describe('SidebarService: the numbers next to the modules (sidebarCount)', () => {
  function setup(sidebarCount?: SidebarCountConfig) {
    const config: BaseAppConfig = {apiUrl: '', appName: 'test', modules: [], sidebarCount};
    TestBed.configureTestingModule({
      providers: [
        {provide: BASE_APP_CONFIG, useValue: config},
        {provide: Juice, useValue: {}},
        {provide: JuiceboxService, useValue: {getLanguage: () => 'en_GB'}},
        {provide: PROJECT_API, useValue: {open: 7}},
      ],
    });
    const service = TestBed.inject(SidebarService);
    const visible = [{id: 'users'}, {id: 'orders'}] as SidebarItem[];
    vi.spyOn(service, 'getVisibleSidebarItems').mockResolvedValue(visible);
    return service;
  }

  it('shows none without the project\'s getSidebarCount', async () => {
    const service = setup();
    await service.refreshCounts();
    expect(service.counts()).toEqual({});
    expect(service.countsFollowNavigation).toBe(false);
  });

  it('asks for the modules of the user\'s sidebar and keeps the numbers answered', async () => {
    const getSidebarCount = vi.fn().mockResolvedValue({users: 128, orders: 0, exports: null, pages: 'many', stock: NaN});
    const service = setup({getSidebarCount});
    await service.refreshCounts();
    expect(getSidebarCount).toHaveBeenCalledWith(['users', 'orders']);
    expect(service.counts()).toEqual({users: 128, orders: 0});
  });

  it('runs the project\'s function in an injection context, and takes an Observable\'s first answer', async () => {
    const service = setup({getSidebarCount: () => of({orders: inject(PROJECT_API).open})});
    await service.refreshCounts();
    expect(service.counts()).toEqual({orders: 7});
  });

  it('a slower older answer does not replace a newer one', async () => {
    let answerFirst!: (counts: Record<string, number>) => void;
    const getSidebarCount = vi.fn()
      .mockReturnValueOnce(new Promise(resolve => answerFirst = resolve))
      .mockResolvedValueOnce({users: 2});
    const service = setup({getSidebarCount});
    const first = service.refreshCounts();
    await service.refreshCounts();
    answerFirst({users: 1});
    await first;
    expect(service.counts()).toEqual({users: 2});
  });

  it('keeps the numbers read last when a reading fails', async () => {
    const getSidebarCount = vi.fn().mockResolvedValueOnce({users: 5}).mockRejectedValueOnce(new Error('down'));
    const logged = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const service = setup({getSidebarCount});
    await service.refreshCounts();
    await service.refreshCounts();
    expect(service.counts()).toEqual({users: 5});
    expect(logged).toHaveBeenCalled();
  });

  it('follows the page changes unless the project reads them only on load', () => {
    expect(setup({getSidebarCount: () => ({})}).countsFollowNavigation).toBe(true);
    TestBed.resetTestingModule();
    expect(setup({getSidebarCount: () => ({}), refresh: 'load'}).countsFollowNavigation).toBe(false);
  });
});
