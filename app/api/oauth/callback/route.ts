import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code) {
    return NextResponse.json({ error: 'No code provided' }, { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID!,
        client_secret: process.env.GITHUB_CLIENT_SECRET!,
        code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (tokenData.error) {
      console.error('OAuth error:', tokenData);
      return NextResponse.redirect(new URL('/setup?error=oauth_failed', request.url));
    }

    const accessToken = tokenData.access_token;

    // Get user info from GitHub
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${accessToken}`,
        'User-Agent': 'PiPilot-SWE-Agent',
      },
    });

    const userData = await userResponse.json();

    // Get user's actual email (including private emails)
    let userEmail = userData.email; // Fallback to public email
    try {
      const emailsResponse = await fetch('https://api.github.com/user/emails', {
        headers: {
          'Authorization': `token ${accessToken}`,
          'User-Agent': 'PiPilot-SWE-Agent',
        },
      });
      const emailsData = await emailsResponse.json();
      
      // Find primary email (verified and primary)
      if (Array.isArray(emailsData)) {
        const primaryEmail = emailsData.find((e: any) => e.primary && e.verified);
        if (primaryEmail) {
          userEmail = primaryEmail.email;
        }
      }
    } catch (emailError) {
      console.warn('Failed to fetch user emails, using public email:', emailError);
    }

    // Store user in database
    const supabase = await createClient();
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('github_username', userData.login)
      .single();

    if (!existingUser) {
      await supabase.from('users').insert({
        github_user_id: userData.id,
        github_username: userData.login,
        email: userEmail,
        name: userData.name,
        avatar_url: userData.avatar_url,
      });
    }

    // Redirect back to setup with user identified and store token
    const redirectUrl = new URL('/setup', request.url);
    redirectUrl.searchParams.set('user_id', userData.login);
    redirectUrl.searchParams.set('github_token', accessToken);
    if (state) {
      // State can contain installation_id, etc.
      const stateData = JSON.parse(atob(state));
      Object.keys(stateData).forEach(key => {
        redirectUrl.searchParams.set(key, stateData[key]);
      });
    }

    const response = NextResponse.redirect(redirectUrl);
    // Also set as secure HTTP-only cookie for server-side auth
    response.cookies.set('github_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 365, // 1 year
    });

    return response;
  } catch (error) {
    console.error('OAuth callback error:', error);
    return NextResponse.redirect(new URL('/setup?error=server_error', request.url));
  }
}