# React Email Reference

React Email is a component library for building HTML emails using React.

## Key Components
- `Html`, `Head`, `Body`, `Container`, `Section`, `Row`, `Column`
- `Text`, `Heading`, `Link`, `Button`, `Img`
- `Hr`, `Preview`, `Font`
- `CodeBlock`, `Markdown`

## Styling
- Use Tailwind CSS with `pixelBasedPreset` for pixel-based units
- Use table layouts instead of flexbox
- Always add `box-border` class on buttons
- Always add `border-solid` class on borders
- Max width ~600px for email body
- Keep file size under 102KB

## Constraints
- No SVG or WEBP images (use PNG/JPG)
- No flexbox layouts
- No CSS media queries
- No template variables like `{{name}}` — use React props instead
- Test across Gmail, Outlook, Apple Mail, Yahoo Mail

## Usage with Resend SDK
```typescript
import { Resend } from 'resend';
import { WelcomeEmail } from './emails/welcome';

const resend = new Resend('re_xxxxxxxxx');

await resend.emails.send({
  from: 'Acme <hello@acme.com>',
  to: ['user@example.com'],
  subject: 'Welcome!',
  react: <WelcomeEmail name="John" />,
});
```
