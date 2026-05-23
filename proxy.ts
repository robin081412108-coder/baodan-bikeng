import { NextResponse, type NextRequest } from "next/server";

const ADMIN_REALM = "baodan-bikeng-admin";

function getAdminCredentials() {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password =
    process.env.ADMIN_PASSWORD ||
    (process.env.NODE_ENV === "production" ? "" : "admin123");

  return { username, password };
}

function unauthorized(message = "需要后台访问密码。") {
  return new NextResponse(message, {
    status: 401,
    headers: {
      "WWW-Authenticate": `Basic realm="${ADMIN_REALM}", charset="UTF-8"`,
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export function proxy(request: NextRequest) {
  const { username, password } = getAdminCredentials();

  if (!password) {
    return new NextResponse("生产环境未配置 ADMIN_PASSWORD，后台已被锁定。", {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Basic ")) {
    return unauthorized();
  }

  const credentials = atob(authorization.slice("Basic ".length));
  const separatorIndex = credentials.indexOf(":");
  const inputUsername = credentials.slice(0, separatorIndex);
  const inputPassword = credentials.slice(separatorIndex + 1);

  if (inputUsername !== username || inputPassword !== password) {
    return unauthorized("后台账号或密码不正确。");
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
