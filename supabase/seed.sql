-- ============================================================================
-- SEED DATA: seed.sql
-- PROJETO: Amigos do Caio — Painel de Comunicação com Tutores (Guapimirim/RJ)
-- ============================================================================

-- 1. CONFIGURAÇÕES PADRÃO DO SISTEMA
insert into public.configuracoes (chave, valor) values
  ('remetente_numero', '5521976397273'),
  ('zapi_ativo', 'false'),
  ('zapi_instance_id', ''),
  ('zapi_token', ''),
  ('zapi_client_token', ''),
  ('zapi_base_url', 'https://api.z-api.io'),
  ('delay_entre_envios_ms', '5000'),
  ('delay_digitando_s', '2'),
  ('max_tentativas', '3'),
  ('nome_assinatura', 'Equipe Amigos do Caio')
on conflict (chave) do update set valor = excluded.valor;

-- 2. TEMPLATES OFICIAIS DE COMUNICAÇÃO
insert into public.templates (id, titulo, categoria, corpo, ativo) values
  (
    '11111111-1111-1111-1111-111111111111',
    'Campanha de Vacinação Antirrábica',
    'vacinacao',
    'Olá, {{nome_tutor}}! 🐾

A Secretaria de Bem-Estar e Proteção Animal de Guapimirim informa: *campanha de vacinação antirrábica* no bairro {{bairro}}.

Traga o {{nome_pet}} ({{especie}}) com coleira e guia. A vacinação é *gratuita*.

{{assinatura}}',
    true
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'Feira de Adoção Responsável',
    'adocao',
    'Oi, {{nome_tutor}}! 🐶🐱

Neste sábado tem *Feira de Adoção* em Guapimirim! Filhotes e adultos esperando um lar cheio de amor.

Se o {{nome_pet}} já faz sua casa feliz, imagina um irmãozinho pra ele?

Entrada gratuita. Traga a família!

{{assinatura}}',
    true
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'Evento Pet no Bairro',
    'evento',
    'Atenção, tutores de {{bairro}}! 🎪

Vem aí o *Evento Pet de Guapimirim*: banho solidário, microchipagem, orientação veterinária e adoção.

Esperamos você e o {{nome_pet}}!

{{assinatura}}',
    true
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'Mutirão Municipal de Castração',
    'castracao',
    'Olá, {{nome_tutor}}! 🩺

Estão abertas as inscrições para o *Mutirão Gratuito de Castração* em Guapimirim.

Se você deseja cadastrar o {{nome_pet}} ({{especie}}), responda esta mensagem para agendarmos a triagem presencial. Vagas limitadas por ordem de resposta!

{{assinatura}}',
    true
  ),
  (
    '55555555-5555-5555-5555-555555555555',
    'Comunicado Geral de Proteção Animal',
    'geral',
    'Prezado(a) {{nome_tutor}},

Lembramos aos moradores do bairro {{bairro}} sobre a importância de manter as vacinas do {{nome_pet}} em dia e evitar o abandono. Cuide de quem sempre te dá carinho!

Em caso de denúncias de maus-tratos ou dúvidas, fale com o nosso gabinete.

{{assinatura}}',
    true
  )
on conflict (id) do nothing;

-- 3. TUTORES DE EXEMPLO (Guapimirim / RJ)
insert into public.tutores (id, nome_completo, cpf, telefone_original, telefone_e164, bairro, ativo) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Mariana Santos Silva', '21458963201', '(21) 98765-4321', '5521987654321', 'Centro', true),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Carlos Eduardo Moreira', '78451296305', '(21) 97654-3210', '5521976543210', 'Bananal', true),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Fernanda Lima Oliveira', '36521489710', '(21) 96543-2109', '5521965432109', 'Parada Modelo', true),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Rodrigo Peixoto Castro', '52896314782', '(21) 99887-1122', '5521998871122', 'Caneca Fina', true),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Juliana Rezende Costa', '41236589745', '(21) 98123-4567', '5521981234567', 'Citrolândia', true),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Paulo Roberto Guimarães', '96325874102', '(21) 97412-5896', '5521974125896', 'Paiol', true),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Beatriz Nogueira Souza', '15975348620', '(21) 99123-9874', '5521991239874', 'Vale das Pedrinhas', true),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Lucas Fernandes Dias', '85214796325', '(21) 98321-6549', '5521983216549', 'Quinta Mariana', true)
on conflict (cpf) do nothing;

-- 4. PETS VINCULADOS AOS TUTORES
insert into public.pets (tutor_id, nome, sexo, idade, especie, raca) values
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Thor', 'Macho', '3 anos', 'Cão', 'Vira-lata (SRD)'),
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Mel', 'Fêmea', '1 ano', 'Gato', 'Siamês'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'Pipoca', 'Fêmea', '2 anos', 'Cão', 'Poodle'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'Simba', 'Macho', '4 anos', 'Gato', 'SRD'),
  ('a1b2c3d4-0004-4000-8000-000000000004', 'Bob', 'Macho', '5 anos', 'Cão', 'Labrador'),
  ('a1b2c3d4-0005-4000-8000-000000000005', 'Luna', 'Fêmea', '8 meses', 'Gato', 'Persa'),
  ('a1b2c3d4-0006-4000-8000-000000000006', 'Marley', 'Macho', '2 anos', 'Cão', 'Golden Retriever'),
  ('a1b2c3d4-0007-4000-8000-000000000007', 'Nina', 'Fêmea', '1 ano e meio', 'Cão', 'SRD'),
  ('a1b2c3d4-0008-4000-8000-000000000008', 'Frajola', 'Macho', '3 anos', 'Gato', 'SRD');
