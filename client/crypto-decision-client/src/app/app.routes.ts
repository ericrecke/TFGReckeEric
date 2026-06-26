import { Routes } from '@angular/router';
import { LoginComponent } from './features/auth/login/login';
import { RegisterComponent } from './features/auth/register/register';
import { DashboardComponent } from './features/dashboard/dashboard';
import { AnalysisComponent } from './features/analysis/analysis';
import { RecommendationsComponent } from './features/recommendations/recommendations';
import { OperationsComponent } from './features/operations/operations';
import { authGuard } from './core/guards/auth-guard';
export const routes: Routes = [
    {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full'
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'register',
        component: RegisterComponent
    },
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [authGuard]
    },
    {
        path: 'analysis',
        component: AnalysisComponent,
        canActivate: [authGuard]
    },
    {
        path: 'recommendations',
        component: RecommendationsComponent,
        canActivate: [authGuard]
    },
    {
        path: 'operations',
        component: OperationsComponent,
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: 'dashboard'
    }
];
