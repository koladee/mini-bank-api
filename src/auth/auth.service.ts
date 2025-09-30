import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwt: JwtService) {}

  async register(email: string, password: string) {
    const exists = await this.prisma.user.findUnique({ where: { email } });
    if (exists) throw new BadRequestException('Email already registered');
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

    const user = await this.prisma.user.create({
      data: { email, passwordHash, role: 'user' },
    });

    // auto-create USD & EUR accounts
    await this.prisma.account.createMany({
      data: [
        { userId: user.id, currency: 'USD', balance: 1000 },
        { userId: user.id, currency: 'EUR', balance: 500  },
      ] as any,
      skipDuplicates: true,
    });

    return this.issueTokens(user.id, user.email, user.role);
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');
    const ok = await argon2.verify(user.passwordHash, password);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issueTokens(user.id, user.email, user.role);
  }

  async me(user: { sub: string; email: string; role: string }) {
    const u = await this.prisma.user.findUnique({ where: { id: user.sub } });
    if (!u) throw new UnauthorizedException('User not found');
    return { id: u.id, email: u.email, role: u.role };
  }

  private async issueTokens(sub: string, email: string, role: string) {
    const accessToken = await this.jwt.signAsync({ sub, email, role });
    return { accessToken };
  }
}
